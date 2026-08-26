# ADR-0010: Isolate R2 environments and promote verified releases

- Status: Accepted
- Date: 2026-08-26

## Context

ADR-0008 isolates development and production code deployments, but both Pages
projects temporarily read `oss-knowledge-base-poc`. A development data refresh
therefore changes production immediately. Rebuilding production separately
would also make its bytes differ from the release already inspected in
development.

Feed and Search are independent versioned projections under ADR-0004 and
ADR-0007. Each owns a complete immutable release and one mutable `current`
pointer. R2 cannot atomically switch both pointers, and the public APIs do not
join their revisions.

## Decision

- Bind development Pages to a private `oss-knowledge-base-dev` bucket and
  production Pages to a private `oss-knowledge-base-prod` bucket.
- Keep `oss-knowledge-base-poc` only as a temporary rollback and inspection
  resource during cutover; it is not an active environment.
- Describe one completed Feed plus Search materialization with the operational
  `osskb.publication-set.v1` contract from Spec 006.
- A development publisher may write only the development bucket. It validates
  all immutable objects before switching either projection's pointer.
- Production changes only through an explicit approved promotion. Promotion
  copies the selected development release's immutable bytes under the same
  keys, verifies their byte lengths and SHA-256 digests, and then switches each
  projection pointer last.
- An existing immutable destination key is reusable only when its bytes match.
  A different digest is a conflict and is never overwritten.
- Feed and Search pointers remain independent. If one projection has switched
  and the other fails, both remain readable at their respective complete
  revisions; there is no shared public `DataRelease` pointer.
- R2 stores public-safe projections and publication evidence only. Canonical
  events, connector checkpoints, and replay state remain outside the serving
  plane.
- Pull-request tests use fixtures and an in-memory or local object store. They
  make no paid GitHub, Cloudflare, LLM, embedding, or load-test calls.

## Alternatives considered

### Use prefixes in one shared bucket

Rejected. A shared credential or misconfigured binding could still cross the
environment boundary, and the bucket would no longer express least privilege.

### Rebuild production from source

Rejected. It refetches mutable upstream data and can produce different bytes,
timestamps, or ranking results from the release inspected in development.

### Switch Feed and Search through one public pointer

Rejected for this stage. The projections have different corpora and rebuild
cadences. A combined pointer would couple valid independent releases and add a
new API resolution layer without a demonstrated user need.

### Store events and checkpoints in R2

Rejected. Serving availability and processing durability have different
ownership. Spec 004 and the future Fluss/Flink stage own event replay and
checkpoint semantics.

## Consequences

- Development refreshes cannot mutate production through the same R2 binding.
- Promotion is deterministic, auditable, retryable, and idempotent.
- A temporary Feed/Search revision difference is visible but never exposes an
  incomplete release.
- Two buckets and separately scoped credentials must be bootstrapped before
  remote publication is enabled.
- Rollback selects previously verified pointers; it does not rebuild or delete
  immutable objects.

## Revisit when

- a public consumer must atomically observe Feed and Search from one data cut;
- measured duplicate storage justifies content-addressed shared objects;
- a processing plane replaces the TypeScript publisher while preserving this
  serving protocol;
- environment isolation needs per-branch preview data rather than one shared
  development bucket.
