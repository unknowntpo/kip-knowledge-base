# Spec 006 Acceptance Scenarios

Status: Accepted as the implementation gate

These scenarios define the implementation gate. Pull-request evidence uses
recorded fixtures and isolated local R2. Live Cloudflare/GitHub checks are
explicit post-merge operations and are never load tests.

## Implementation progress

- Slice 1 contract and local proof completed on 2026-08-26 in
  `packages/serving-contract/src/publication-set.ts`.
- `packages/serving-contract/test/publication-set.test.ts` proves the local
  portions of P3, P4, P6, P7, P9, and P10 with an in-memory object store,
  including missing objects, invalid manifests, conflicts, exact-byte copy,
  pointer-last ordering, idempotence, and independent complete revisions.
- P1, P2, P5, P8, and P11-P15 still require later environment, workflow, or
  end-to-end slices. Spec 006 is accepted but not yet complete.

## P1 — Pages read only their environment

**Given** development and production contain distinguishable valid releases  
**When** `/api/feed`, `/api/detail/:id`, `/api/search`, and
`/api/search-detail/:ref` are requested from each Pages project  
**Then** each site returns data only from its own `OSS_KB_BUCKET` binding  
**And** no application fallback reads the other environment or the POC bucket.

## P2 — Development publication cannot mutate production

**Given** valid development and production pointers  
**When** a new `PublicationSetV1` is published to development  
**Then** development serves the new complete Feed and Search releases  
**And** every production object and pointer remains byte-identical.

## P3 — Publication set is complete and verifiable

**Given** one completed Kafka/DataFusion processor output  
**When** Feed and Search projections are assembled  
**Then** exactly one Feed and one Search release descriptor are produced  
**And** every declared object key is unique, release-scoped, byte-counted, and
SHA-256 verified  
**And** missing details, shards, manifests, or cross-release keys fail before a
mutable pointer is written  
**And** Search uses the same completed input state rather than refetching the
source.

## P4 — Each projection becomes visible manifest-last

**Given** a previously readable environment  
**When** a new Feed or Search release is published  
**Then** all of that projection's immutable objects and release manifest are
written and verified before its `current` pointer  
**And** the public API never resolves a pointer to a missing or mixed-revision
object.

## P5 — Partial failure preserves a readable release

**Given** a previously readable environment  
**When** acquisition, validation, materialization, upload, or digest
verification fails at each injectable boundary  
**Then** no incomplete projection becomes current  
**And** every API continues serving its last complete release  
**And** the failed phase and retry boundary are observable.

## P6 — Immutable-key conflict fails closed

**Given** a destination already contains an object under a declared immutable
key with different bytes  
**When** publication or promotion validates that key  
**Then** it reports a digest conflict  
**And** does not overwrite the object  
**And** does not advance that projection's pointer.

## P7 — Production promotion copies exact validated bytes

**Given** a selected development `PublicationSetV1`  
**When** production promotion completes  
**Then** every promoted immutable production object has the same key, byte
length, and SHA-256 digest as development  
**And** production pointers name only those verified releases  
**And** the workflow performs no GitHub fetch, materialization, timestamp
regeneration, or frontend build.

## P8 — Production requires explicit authority

**Given** a scheduled development run, main push, pull request, or failed
development publication  
**When** workflows are inspected and executed  
**Then** none can write the production bucket or production pointer  
**And** production changes only through an explicitly dispatched promotion
that passes the production environment's approval boundary.

## P9 — Retry and repeated promotion are idempotent

**Given** immutable objects already uploaded or one publication set already
current  
**When** the same upload or promotion is retried  
**Then** matching objects are accepted without mutation  
**And** the same logical pointers and public responses remain current  
**And** an already-current production promotion creates no duplicate object
writes.

## P10 — Feed and Search remain independently safe

**Given** both projections are complete at revision A  
**When** Search switches to revision B but Feed publication or promotion then
fails  
**Then** Search B and Feed A are both independently readable  
**And** Search detail references resolve only inside Search B  
**And** Feed details resolve only inside Feed A  
**And** no API combines their immutable object prefixes.

## P11 — Source rate limit or outage causes stale serving, not a storm

**Given** a complete development release and a source rate limit, partial page
sequence, or transport outage  
**When** the development refresh runs  
**Then** it publishes no partial projection  
**And** keeps the previous pointers readable  
**And** records the source request/page counts and one bounded retry boundary  
**And** concurrency control prevents overlapping scheduled retries.

## P12 — Code deploy and data publish remain independent

**Given** an unchanged Pages artifact and a valid new development publication  
**When** only the data publisher completes  
**Then** the development browser shows the new Feed/Search data without a code
deployment  
**And** a code-only main or tag deployment performs no source fetch and changes
no R2 data pointer.

## P13 — Rollback selects an existing complete release

**Given** at least two verified publication sets  
**When** an authorized rollback selects the earlier set  
**Then** its immutable objects are verified before pointers change  
**And** the public APIs return the earlier complete projections  
**And** no immutable release object is deleted, rewritten, or rebuilt.

## P14 — Remote target configuration fails closed

**Given** a missing, unknown, or mismatched environment, bucket, confirmation,
or credential scope  
**When** a remote publication command starts  
**Then** it exits before any R2 write  
**And** it never falls back to `oss-knowledge-base-poc` or another default.

## P15 — CI has no paid external side effects

**Given** a pull request  
**When** unit, integration, and browser E2E gates run  
**Then** they use recorded Kafka/DataFusion fixtures and a recreated local R2
namespace  
**And** make no live GitHub, Cloudflare R2, LLM, embedding, or load-test request.

## Evidence layers

- **Unit:** contract parsing, key-prefix validation, digest verification,
  conflict detection, pointer ordering, and idempotent planning (`P3`, `P4`,
  `P6`, `P9`, `P14`).
- **Integration:** completed recorded publication through fake/local dev and
  production buckets, injected failures, exact-byte promotion, mixed safe
  revisions, and rollback (`P1`-`P7`, `P9`, `P10`, `P13`).
- **E2E:** local Pages Functions and Vue bound to distinguishable local
  namespaces; publish data without rebuilding the frontend and verify Feed →
  Detail plus Search → Detail (`P1`, `P2`, `P12`, `P15`).
- **Workflow inspection/test:** event triggers, permissions, environment gates,
  concurrency, and absence of production writes from development/code workflows
  (`P8`, `P11`, `P12`, `P14`).
- **Explicit public smoke:** after bootstrap or promotion, make only the minimum
  Feed/Search/Detail requests needed to prove both public environments. Record
  object counts, bytes, errors, and Cloudflare usage; do not benchmark (`P1`,
  `P2`, `P7`, `P12`).

## Review checklist

- Confirm that separate buckets, not object prefixes in one bucket, are the
  desired environment isolation boundary.
- Confirm that development may publish automatically only after a bounded
  manual proof, while production remains explicit and approved.
- Confirm that production promotion copies verified bytes and never reruns the
  source or materializer.
- Confirm that Feed and Search may temporarily expose different complete
  revisions, consistent with ADR-0007.
- Confirm that R2 owns public-safe projections and publication metadata only,
  never canonical events or connector checkpoints.
- Confirm that Spec 006 does not claim Fluss/Flink production durability.
- Confirm that there is no latency/load gate and no paid external CI path.
