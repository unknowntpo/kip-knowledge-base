# Spec 004: Replayable GitHub-to-Feed Reference Pipeline

Status: Implemented

Implemented: 2026-08-25

Public proof: https://oss-knowledge-base-poc.pages.dev

## Intent

Introduce a replayable event boundary between GitHub polling and the existing
Feed/R2 projection before implementing the same behavior in Fluss and Flink.
The TypeScript implementation is the deterministic reference oracle: future
stream-processing implementations must produce the same logical output for the
same events, configuration, and materialization time.

This spec upgrades the current in-process transformation. It does not claim to
be the final production processing infrastructure.

## User outcome

The deployed Feed and FeedDetail interaction does not change. When GitHub is
temporarily unavailable, duplicated, or delivers updates out of order, users
continue to see the last complete R2 release. A successful replay produces the
same Feed entries, details, timelines, statuses, activity reasons, and source
links.

## Current behavior

The deployed POC currently follows this path:

```text
GitHub API via gh CLI
        |
        v
loadLiveFeed() fetches and transforms in one process
        |
        v
FeedIndex + FeedDetail -> versioned R2 projection -> Pages Functions -> Vue
```

This path has real processing, but fetching, normalization, materialization,
and publishing share one execution boundary. The normalized observations are
not yet a replayable input artifact, and connector progress is not committed
through an explicit checkpoint protocol.

## Target behavior for this spec

```text
GitHubConnector(previous checkpoint)
        |
        +--> DomainEventV1 batch
        +--> candidate next checkpoint
                    |
                    v
TypeScript reference materializer
        |
        v
FeedIndex + FeedDetail -> existing manifest-last R2 publisher -> existing UI
```

`DomainEventV1` is the existing project-neutral event contract. This spec does
not introduce a second `CommunityEvent` concept.

The reference pipeline must have explicit inputs:

- a finite `DomainEventV1` event set;
- project profiles and deterministic policy revisions;
- an activity window and materialization timestamp;
- the previous connector checkpoint when polling GitHub.

Wall-clock reads inside the materializer are forbidden. The controller supplies
time as input so replay remains deterministic.

## Responsibilities

### GitHub connector

- Communicate with GitHub through the existing authenticated `gh api` transport.
- Translate GitHub issues, pull requests, and comments into `DomainEventV1`.
- Preserve canonical URLs, upstream timestamps, source revisions, authorship,
  project/source identity, and an immutable payload reference.
- Page through all results in scope; a fixed `per_page` sample is not a
  production checkpoint strategy.
- Treat the checkpoint as connector-specific, opaque state. The first version
  may use a per-source updated-at watermark with a bounded overlap window;
  overlapping results are expected and removed by event deduplication.
- Return a candidate checkpoint but never commit it itself.

### Pipeline controller

- Accept a poll only when the whole requested page sequence completed.
- Make the event batch durable before committing its candidate checkpoint.
- Never expose a partially generated R2 release.
- Leave the previous manifest current when polling, event validation,
  materialization, or publication fails.
- Record the connector revision, profile revision, materializer revision,
  input event count, rejected event count, and materialization time.

The TypeScript reference harness may model durability with a versioned
serialized event-log fixture. Production durability is introduced by Fluss in
the following architecture stage; passing this spec does not claim that a local
fixture is a production event store.

### Reference materializer

- Validate every untrusted event at the runtime boundary.
- Deduplicate by `(projectId, sourceInstanceId, entityId, sourceCursor)`.
- Exclude `observedAt` from logical identity and feed results.
- Select current entity revisions and order timeline records deterministically.
- Produce `FeedEntry`, `FeedDetail`, connections, cited source-extract key
  points, status, and activity evidence through the existing domain contracts.
- Reject conflicting normalized facts that share one dedupe identity; do not
  choose one silently.
- Serialize results canonically so a logical output digest can be compared with
  later Flink output.

### R2 serving publisher

The existing Spec 003 contract remains authoritative:

- release objects are immutable;
- FeedDetail is loaded separately from the Feed index;
- `current.json` is written last;
- R2 owns serving projections, not canonical events or connector checkpoints.

## Initial scope

- GitHub issues, pull requests, and issue comments;
- Apache Kafka and Apache DataFusion;
- current shared activity Feed and FeedDetail projections;
- deterministic source-extract key points already used by the POC;
- `gh` CLI transport, with rate-limit and partial-fetch behavior exposed to the
  controller;
- serialized event and expected-projection fixtures usable by TypeScript and a
  future Flink parity test.

## Non-goals

- Running Fluss or Flink in this spec;
- claiming production event durability before the Fluss stage;
- GitHub webhooks;
- Jira, Confluence, mailing-list, Slack, Flink, or Spark connectors;
- semantic clustering, semantic search, LLM summaries, or personalized ranking;
- changing the Vue component hierarchy, Pages Functions API, or R2 object
  contract;
- complete historical backfill of Kafka or DataFusion.

## POC-to-production architecture evolution

### Stage 0 — Serving POC (complete)

Vue on Cloudflare Pages reads immutable Feed/FeedDetail projections through
Pages Functions and private R2. GitHub polling and transformation are still one
in-process publisher path.

### Stage 1 — Reference processing contract (this spec)

GitHub polling emits normalized events and an explicit checkpoint candidate.
The TypeScript oracle proves replay, retry, ordering, failure, provenance, and
canonical-output behavior while keeping the deployed UI and R2 contract stable.

### Stage 2 — Durable streaming processing

The connector appends the accepted event contract to Fluss Log Tables. Flink
owns stateful deduplication, ordering, current views, and Feed materialization.
The same fixture used by this spec is sent through Fluss/Flink, and its output
must match the TypeScript oracle before cutover. Only after parity is proven may
the R2 publisher switch from the TypeScript result to the Flink result.

### Stage 3 — Production recovery and historical plane

Iceberg receives open historical tables and becomes the export/backfill replay
boundary. Production readiness adds lag and rejected-event metrics, checkpoint
inspection, dead-letter handling, runbooks, bounded backfill, release rollback,
and periodic rebuild tests. More community connectors are added only through
the same event and replay assertions.

### Stage 4 — Optional semantic capabilities

Search indexes, embeddings, clustering, and LLM summaries consume retained
evidence as derived paths. Their failure cannot block ingestion, deterministic
Feed generation, source browsing, or replay.

## Cutover rule

Spec 004 may replace the current `loadLiveFeed()` direct transformation only
after all scenarios in [`acceptance.md`](acceptance.md) pass. It does not
authorize a Fluss/Flink production cutover. That cutover requires a separate
compatibility spike, pinned versions, and oracle parity using the same fixture.

## Implementation result

- `GitHubConnector` now emits `DomainEventV1` batches plus an uncommitted
  `GitHubCheckpointV1` candidate for Kafka and DataFusion.
- `ReferencePipelineController` owns append, materialization, checkpoint, and
  publication ordering. The reference state is serializable for restart tests;
  it is deliberately not presented as a production event store.
- `@oss-knowledge-base/reference-pipeline` is the deterministic TypeScript
  oracle. Its recorded projection digest is
  `sha256:cecea8b974520ab3185e0f3ea944642890d24429601595028fd7bc02eb618c36`.
- The existing FeedIndex v2, lazy FeedDetail, Pages Functions, and manifest-last
  R2 contract required no UI translation.
- The public proof currently serves release `2026-08-25T08-29-41-122Z`, with
  184 Feed entries built from 353 current GitHub source records.

This completes Stage 1 only. Production event durability and Flink parity remain
Stage 2 work under this spec's POC-to-production evolution.
