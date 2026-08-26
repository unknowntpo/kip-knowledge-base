# ADR-0003: Use Iceberg as the open history layer

- Status: Accepted, not yet implemented
- Date: 2026-08-17

## Context

The project wants Fluss for event and current-state workloads without making
all historical analytics or recovery dependent on a single serving system.
Spark requires stable, versioned input, and the project constitution requires a
tested exit path based on open formats.

## Decision

Persist normalized historical events and derived analytical datasets as
versioned Iceberg tables. Treat Iceberg snapshots as the input contract for
Spark and as the export/rebuild boundary for long-term portability.

Fluss remains the online source for event ingestion and current keyed state;
Iceberg is not placed on the synchronous viewer request path.

## Alternatives considered

- Keep all history only in Fluss: simpler initially, but creates an avoidable
  dependency for offline analytics and recovery.
- Plain Parquet files: open and simple, but lacks the table-level snapshots,
  schema evolution, and atomic metadata needed for reliable reproducibility.
- Git/JSON only: useful for small fixtures and reviewable content, but does not
  scale as the analytical history layer.

## Consequences

- Batch jobs record the exact Iceberg snapshot and algorithm version used.
- Schema evolution must remain backward compatible or include a migration.
- A scheduled validation must prove exported history can rebuild selected
  current views.
- A catalog and object storage are required in deployed environments, even
  though local development may use a filesystem-backed catalog.

## Revisit when

- Fluss-to-Iceberg integration cannot preserve required ordering or provenance;
- table maintenance cost exceeds the analytical benefit;
- a more portable open table format demonstrably fits the contracts better.
