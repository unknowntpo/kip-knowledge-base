# ADR-0002: Use Flink online and Spark offline

- Status: Accepted, not yet implemented
- Date: 2026-08-17

## Context

The product has two materially different workloads. Community events require
continuous deduplication, ordering, joins, and current views. Clustering,
embedding generation, evaluation, and recommendation features can operate on
bounded, versioned historical snapshots.

## Decision

Use Flink for online/stateful processing and Spark for offline/batch analytical
processing.

Flink owns event-time handling, idempotency, explicit entity links, incremental
state, and current FeedEntry/FeedDetail projections. Spark owns reproducible
clustering, embedding and recommendation feature jobs over Iceberg snapshots.

## Alternatives considered

- Flink for both streaming and batch: fewer engines, but provides less direct
  practice with the Spark ecosystem that is relevant to the project goals.
- Spark Structured Streaming for both: possible, but this project prioritizes
  Flink's continuous stateful stream-processing model for online views.
- One streaming database for all transformations: simpler SQL surface, but
  reduces control over the explicit online/offline boundary and portability.

## Consequences

- Logic shared by the two engines must live in portable schemas and small pure
  functions, not framework-specific state.
- Iceberg snapshots are the contract between online history and offline jobs.
- Feature definitions, algorithm versions, and input snapshot IDs must be
  recorded so offline outputs are reproducible.
- The project accepts the operational and testing cost of two compute engines.

## Revisit when

- the offline workload remains too small to justify Spark;
- equivalent logic repeatedly diverges between engines;
- latency requirements move a batch feature into the online path.
