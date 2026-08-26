# ADR-0001: Use Fluss for events and current state

- Status: Accepted, not yet implemented
- Date: 2026-08-17

## Context

The product needs an append-oriented event history for community activity and
keyed current views for artifacts, threads, and contributors. It must support
Flink processing, replay, and a credible open-source exit path without making a
paid hosted service part of the data model.

The current Git/Obsidian storage works for a static KIP corpus but is not the
long-term streaming state layer for several communities and high-volume thread
activity.

## Decision

Use Fluss Log Tables for canonical normalized events and Fluss Primary Key
Tables for current materialized state. Flink owns stateful transformation into
those views. The new storage and processing contracts are designed directly
from the project-neutral domain model; the existing vault is not a migration
target or required projection.

Use native Fluss/Flink interfaces for the primary integration. Do not make the
system depend on Fluss's Kafka wire-protocol compatibility layer while it is
upstream-documented as in development and disabled by default.

## Alternatives considered

- Kafka topics plus a separate serving database: mature and flexible, but adds
  more independently operated state systems to the first architecture.
- RisingWave: provides an integrated streaming database and SQL experience,
  but couples ingestion, state, serving, and some operational choices more
  tightly than desired for this learning-oriented stack.
- PostgreSQL: excellent serving database, but it does not by itself provide the
  replayable streaming foundation being practiced here.
- Iceberg only: strong open historical storage, but not the low-latency current
  state and event-serving layer required by the thread experience.

## Consequences

- The project gains a focused Fluss/Flink implementation suitable for learning
  and interviews.
- Fluss maturity and operating knowledge become project risks.
- Spark should consume open Iceberg history rather than depend on a proprietary
  or Fluss-specific analytical path.
- The replacement needs its own replay and correctness tests, but does not need
  byte or field parity with the legacy vault.
- Existing Kafka clients are not assumed to work unchanged; Kafka protocol
  compatibility is an optional experiment rather than a foundation.

## Revisit when

- Fluss cannot meet required correctness or recovery tests;
- current-state query latency cannot support the viewer;
- the Iceberg export/replay path proves incomplete;
- operating the additional system costs more than its learning and product
  value.
