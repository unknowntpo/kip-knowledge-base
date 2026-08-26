# Spec 006: Environment-isolated R2 Publication

Status: Accepted for implementation

Owner: Project maintainers

Created: 2026-08-26

Accepted: 2026-08-26

## Intent

Let development receive fresh Kafka/DataFusion Feed and Search projections
without changing production data, then promote one already-validated set of
immutable objects to production without fetching or materializing the sources
again.

This spec introduces the data-publication control plane required before
scheduled refreshes are enabled. It does not introduce the final durable
Fluss/Flink processing plane.

## User outcome

- The development site can show newly published community activity without a
  frontend deployment.
- A failed refresh leaves the last complete Feed and Search releases readable.
- Production changes only after an explicit promotion.
- Production serves the exact immutable projection bytes that were validated in
  development.

## Current behavior and gap

Both Pages projects currently bind `OSS_KB_BUCKET` to the same private
`oss-knowledge-base-poc` bucket:

```text
development Pages ----+
                      +--> oss-knowledge-base-poc R2
production Pages -----+
```

Feed and Search already publish immutable release objects and switch their own
`current` pointer last. Code releases are also isolated: `main` deploys the
development Pages project and a version tag deploys production. However, a
remote data publisher cannot safely target development because the same pointer
would immediately change production.

## Target boundary

```text
bounded source acquisition / completed processor output
                       |
                       v
        deterministic Feed + Search materialization
                       |
                       v
       validate one PublicationSetV1 and its digests
                       |
                       v
          development R2 ----> development Pages
                       |
                explicit promotion
             copy + verify exact bytes
                       |
                       v
           production R2 ----> production Pages
```

The target uses separate private buckets:

| Environment | Pages project | `OSS_KB_BUCKET` target | Write path |
| --- | --- | --- | --- |
| Development | `oss-knowledge-base-dev` | `oss-knowledge-base-dev` | scheduled or manual development publisher |
| Production | `oss-knowledge-base` | `oss-knowledge-base-prod` | explicit production promotion only |

The existing `oss-knowledge-base-poc` bucket remains a temporary rollback and
inspection resource during cutover. It is not a third active environment.

## Governing decisions

- [ADR-0004](../../architecture/decisions/0004-use-pages-functions-and-r2-serving-projections.md)
  owns Pages Functions, private R2 serving projections, and manifest-last Feed
  publication.
- [ADR-0006](../../architecture/decisions/0006-use-typescript-reference-materializer-before-flink.md)
  owns the TypeScript oracle boundary and forbids presenting it as the
  production event store.
- [ADR-0007](../../architecture/decisions/0007-publish-independent-versioned-search-releases.md)
  owns independent Feed/Search releases and Search's manifest-last protocol.
- [ADR-0008](../../architecture/decisions/0008-promote-pages-by-main-and-release-tag.md)
  keeps code deployment separate from data publication and requires a separate
  decision before automatic environment-specific data writes.

[ADR-0010](../../architecture/decisions/0010-isolate-r2-environments-and-promote-verified-releases.md)
records the cross-feature choice of separate buckets plus copy-and-verify
promotion. Acceptance authorizes the local contract slices below; it does not
authorize creating Cloudflare resources or scheduling a remote publisher.

## Publication control contract

`PublicationSetV1` is operational metadata. It is not a domain entity and is
not returned by the public Feed/Search APIs.

```ts
type PublicationEnvironment = "development" | "production";

interface ImmutableProjectionObjectV1 {
  readonly key: string;
  readonly sha256: `sha256:${string}`;
  readonly byteLength: number;
}

type ProjectionReleaseDescriptorV1 =
  | {
      readonly kind: "feed";
      readonly releaseId: string;
      readonly currentKey: "public/v2/current.json";
      readonly current: FeedManifest;
      readonly immutableObjects: readonly ImmutableProjectionObjectV1[];
    }
  | {
      readonly kind: "search";
      readonly releaseId: string;
      readonly currentKey: "public/search/v1/current.json";
      readonly current: SearchCurrentPointerV1;
      readonly immutableObjects: readonly ImmutableProjectionObjectV1[];
    };

interface PublicationSetV1 {
  readonly schema: "osskb.publication-set.v1";
  readonly id: string;
  readonly generatedAt: string;
  readonly inputDigest: `sha256:${string}`;
  readonly materializerRevision: string;
  readonly projections: readonly [
    ProjectionReleaseDescriptorV1,
    ProjectionReleaseDescriptorV1,
  ];
}

interface PromotionRequestV1 {
  readonly schema: "osskb.promotion-request.v1";
  readonly publicationSetId: string;
  readonly from: "development";
  readonly to: "production";
  readonly requestedBy: string;
}
```

Validation requires exactly one Feed and one Search descriptor. Every immutable
key must belong to its declared release prefix, be unique inside the set, and
match its byte count and SHA-256 digest. The Feed/Search serving schemas remain
authoritative; this wrapper only makes their promotion evidence explicit.

## Development publication

1. Acquire a bounded, complete source result or receive one completed processor
   output. A partial GitHub page sequence is not a publishable input.
2. Materialize Feed and Search from the same validated input state. Search must
   not refetch GitHub after Feed completes.
3. Build and validate `PublicationSetV1` before making either release visible.
4. Upload immutable Feed objects, then its `current` pointer last.
5. Upload immutable Search objects and release manifest, then its `current`
   pointer last.
6. Store the immutable publication-set descriptor for later inspection and
   production promotion.

Feed and Search remain independently readable projections under ADR-0007. R2
cannot atomically switch their two mutable pointers together. A temporary state
where one projection is newer is valid because each release owns its complete
details and neither API combines release revisions. The UI must never observe a
pointer to an incomplete release.

The first implementation may use bounded GitHub re-read plus deterministic
deduplication. Connector checkpoints and canonical events must not be stored in
the serving bucket. Durable incremental processing remains a later Fluss/Flink
stage.

## Production promotion

Production promotion is a copy operation, not a rebuild:

1. Select one immutable `PublicationSetV1` already present in development.
2. Require an explicit production workflow dispatch and production-environment
   approval.
3. Copy each immutable object to the production bucket under the same key.
4. If a destination key already exists, accept it only when its digest matches;
   never overwrite an immutable key with different bytes.
5. Verify all destination object digests against the selected publication set.
6. Write each projection's production `current` pointer only after that
   projection is complete and verified.
7. Record the selected publication-set ID, actor, source and destination
   digests, workflow run, and result.

Promotion does not call GitHub, run the materializer, regenerate timestamps, or
change object bodies. Repeating the same successful promotion is idempotent.

## Failure, retry, and rollback semantics

- Source failure or rate limit: publish nothing; keep development pointers on
  their previous releases; expose one bounded retry boundary without a retry
  storm.
- Validation or materialization failure: write no mutable pointer.
- Immutable upload failure: retry the same object safely; do not advance its
  projection pointer.
- Digest conflict at an existing immutable key: fail closed and require a new
  release identity after investigation.
- Promotion failure: every already-switched projection remains complete; every
  unswitched projection remains on its previous complete release. A mixed
  Feed/Search revision is allowed, but a broken release is not.
- Rollback: restore a previously recorded valid pointer after verifying its
  immutable objects. Do not delete or rewrite release objects as rollback.

Checkpoint commitment and event durability are governed by Spec 004 and the
future durable processing spec. Successful R2 upload is not evidence that a
canonical event checkpoint is durable.

## Security and cost boundaries

- Development and production use separate Cloudflare/GitHub environments and
  separately scoped credentials. The development publisher cannot write the
  production bucket.
- The production promoter may read the selected development objects and write
  production only after approval. The frontend and Pages Functions contain no
  R2 credentials.
- Remote commands require an explicit environment and bucket. There is no
  remote fallback to `oss-knowledge-base-poc` or another default bucket.
- Pull-request CI uses recorded fixtures and isolated local R2 only. It makes no
  live GitHub, Cloudflare R2, LLM, embedding, or paid load-test calls.
- Scheduled runs are serialized. Their cadence is operational configuration and
  is enabled only after a manual run records source requests, R2 writes, bytes,
  and outcome.
- Re-promoting an already-current publication set performs validation but no
  duplicate object writes.

## Observability

Each publication or promotion reports:

- environment, publication-set ID, input digest, and materializer revision;
- Feed/Search release IDs, object counts, total bytes, and pointer outcomes;
- source request/page counts and rate-limit state when acquisition occurred;
- previous and selected pointer identities;
- failure phase, retry boundary, actor, workflow run, and elapsed time.

There is no latency or load release gate in this spec. Counts, bytes, duration,
errors, and Cloudflare usage are telemetry used to justify a later measured
decision.

## Non-goals

- Fluss/Flink production durability, replay recovery, or parity cutover;
- storing canonical events or connector checkpoints in R2;
- atomic switching of Feed and Search through one combined public pointer;
- changing `FeedEntry`, `FeedDetail`, Search request/response, or ranking;
- semantic retrieval, LLM summaries, personalization, or new connectors;
- public R2 access, browser-to-R2 credentials, or a separate API Worker;
- branch preview data environments or per-branch R2 buckets;
- automated production promotion;
- load testing or invented latency/shard-size thresholds.

## Smallest implementation slices after acceptance

1. **Contract and local proof:** implement publication-set validation,
   digest/conflict checks, fake-R2 promotion, and the acceptance scenarios with
   recorded Kafka/DataFusion fixtures.
2. **Environment bootstrap:** create the two buckets, bind each Pages project to
   its matching bucket, seed the currently accepted projection, and verify
   cross-environment isolation.
3. **Development publisher:** add a manual bounded live run first; after its
   request/write evidence is reviewed, enable a serialized schedule.
4. **Production promoter:** copy and verify one selected development
   publication set behind explicit production approval, then run a minimal
   public smoke check.

Each slice must leave both public sites on a complete readable release. Code
deployment under ADR-0008 remains independent throughout.

## Exit and next architecture stage

Spec 006 is complete when every scenario in
[`acceptance.md`](./acceptance.md) passes and development can refresh data
without a frontend deploy or production mutation.

The following stage introduces durable events, persisted connector progress,
and Flink parity. It may replace the TypeScript producer, but it must emit the
same Feed/Search serving releases and satisfy this publication contract.
