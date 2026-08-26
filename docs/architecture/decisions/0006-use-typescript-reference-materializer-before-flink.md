# ADR-0006: Use a TypeScript reference materializer before Flink

- Status: Accepted
- Date: 2026-08-25

## Context

The deployed POC fetches GitHub data, transforms it, and publishes R2 objects in
one process. The target architecture assigns durable events to Fluss and
stateful materialization to Flink, but implementing domain semantics first
inside Flink would make infrastructure behavior the only correctness oracle.

Replay, deduplication, ordering, checkpoint commitment, and failure behavior
need repeatable assertions independent of Fluss/Flink deployment state.

## Decision

- Implement a framework-independent TypeScript reference materializer over the
  versioned `DomainEventV1` contract before the Flink job.
- Treat its versioned event fixture and canonical Feed projection as the
  behavioral oracle for Flink parity tests.
- The GitHub connector returns events plus a candidate checkpoint. A pipeline
  controller commits that checkpoint only after the complete batch is durable.
- The reference harness may serialize fixtures for restart tests, but it is not
  the production event store.
- Fluss remains the production event/current-state layer and Flink remains the
  production stateful processor under ADR-0001 and ADR-0002.
- The R2 serving publisher consumes completed projections and never owns event
  retention or connector checkpoints.

## Alternatives considered

- Implement only the Flink job: rejected because failures could not be separated
  from domain-rule errors and local assertions would require the full stack.
- Treat the current GitHub-to-R2 POC as the oracle: rejected because it has no
  explicit event or checkpoint boundary.
- Persist production events in R2: rejected because R2 is the serving projection
  store under ADR-0004, not the processing source of truth.
- Delay all processing until Fluss/Flink are running: rejected because it would
  postpone executable contract validation.

## Consequences

- Deterministic logic must remain portable and receive time/configuration as
  explicit input.
- Some logic is represented twice, so parity tests and revision metadata are
  mandatory.
- The TypeScript implementation is deliberately small and may be discarded
  after Flink correctness and recovery are established, while fixtures remain.
- Production durability is not claimed until the Fluss integration passes its
  own restart and recovery assertions.

## Revisit when

- the reference and Flink implementations repeatedly diverge despite shared
  fixtures;
- a schema feature cannot be represented portably;
- Fluss/Flink compatibility tests cannot consume the canonical fixture;
- maintaining the reference implementation costs more than the independent
  correctness signal it provides.
