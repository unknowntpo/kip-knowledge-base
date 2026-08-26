# Architecture Context

## Legacy system

The current implementation polls Kafka sources, normalizes `ChangeEvent`s,
writes deterministic metadata into an Obsidian vault, and builds a static web
viewer from that vault. It remains useful as a running visual reference, but
its data model and pipeline are not constraints on the replacement.

## Target system

```text
Source connectors + community profiles
        |
        v
Fluss Log Tables  -- canonical observed events
        |
        v
Flink ----------- dedupe, ordering, explicit links, current views
        | \
        |  +------> Fluss Primary Key Tables
        v
Iceberg ---------- open history and replay/export boundary
        |
        +----------> Spark offline features and recommendation candidates
        |
        +----------> R2 serving projections -> API / Feed viewer
                            |
                            +--> cited LLM-derived views
```

## Current implemented stage

Spec 004 completes the replayable TypeScript reference stage:

```text
GitHub via authenticated gh CLI
        |
        v
GitHubConnector -> DomainEventV1 batch + candidate checkpoint
        |
        v
ReferencePipelineController -> serializable reference event state
        |
        v
deterministic TypeScript materializer
        |
        v
FeedIndex + lazy FeedDetail -> manifest-last R2 -> Pages Functions -> Vue
```

Spec 005 adds an independent Search serving release beside that Feed release:

```text
bounded SourceRecord evidence
        |
        v
deterministic chunks + exact/BM25 index
        |
        v
immutable Search shards + FeedDetail objects
        |
        v
manifest-last R2 -> /api/search -> opaque immutable detailRef -> FeedDetail
```

Together these stages prove connector, replay, dedupe, failure, provenance,
evidence retrieval, and serving behavior. They do not replace the target
Fluss/Flink durability and processing plane. ADR-0006 and ADR-0007 govern this
intermediate architecture.

## Replacement boundary

This is a greenfield replacement, not a data-contract migration. The new system
may replace the vault, `Kip` and `ChangeEvent` types, parsers, ingestion jobs,
routes, APIs, and build pipeline. It does not need output parity with the legacy
system.

The preservation boundary is visual only:

- retain the recognizable typography, palette, spacing rhythm, and restrained
  content-first presentation;
- reuse visual tokens or presentational components only when they help;
- allow information architecture, interaction, routing, responsive behavior,
  and accessibility to improve;
- do not import a legacy data contract merely to reuse a visual component.

The legacy viewer can stay runnable during development as a side-by-side visual
reference. Cutover requires the new Spec 001 acceptance gates, not vault parity.

## Terminology boundary

`KafkaCommunityProfile` means the rules that recognize Kafka community concepts
such as KIP and KAFKA Jira keys. It is unrelated to Fluss's experimental Kafka
wire-protocol compatibility layer.

The target system uses native Fluss and Flink interfaces as its primary path.
Kafka wire-protocol compatibility may be evaluated separately, but application
correctness and portability must not depend on it while upstream marks it as in
development.

## Reliability boundaries

- Source adapters may fail independently and resume from persisted cursors.
- Flink jobs assume at-least-once delivery and implement idempotent state.
- Spark reads versioned Iceberg snapshots rather than mutable application state.
- LLM failure degrades summaries and suggestions, never evidence browsing.
- The API exposes provenance and freshness with every FeedEntry and FeedDetail.
