# Spec 001 Implementation Plan

Status: Proposed

Each phase ends with runnable evidence. The legacy viewer may remain available
as a visual reference, but the new implementation does not preserve its data or
route contracts.

## Phase 0: Control plane

- Adopt the constitution, project-neutral domain model, Spec 001, acceptance
  scenarios, and ADRs.
- Record implementation progress in `docs/tasks.md` and notable discoveries in
  `docs/dev-notes.md`.

Evidence: documentation consistency review; no production-code change.

## Phase 1: Generic event contract

- Add versioned TypeScript schemas for Project, CommunityProfile,
  SourceInstance, ArtifactTypeDefinition, Artifact, Thread, Message, Event,
  Relationship, project status, FeedEntry, and FeedDetail.
- Implement reusable source-connector contracts and a
  `KafkaCommunityProfile` against the new Event contract.
- Reuse legacy fixtures only where they are accurate and convenient; do not add
  a compatibility layer for `ChangeEvent` or vault notes.

Evidence: schema validation, stable event identity tests, and A10/A12 fixtures.

## Phase 2: Deterministic materializer

- Build a framework-independent reference materializer over an in-memory event
  set first.
- Implement dedupe, event-time ordering, explicit links, unresolved-link state,
  and deterministic serialization.
- Use this implementation as the oracle for later Flink tests.

Evidence: A1-A7 and A10.

## Phase 3: Fluss and Flink vertical slice

- Pin compatible Fluss and Flink versions through a runnable local spike.
- Define Log Table and Primary Key Table DDL from the versioned domain schema.
- Feed the representative KIP event fixture into Fluss.
- Implement the Flink job and compare its materialized result with the reference
  materializer.

Evidence: clean-environment integration test, restart/retry test, and A2-A4.

## Phase 4: Feed query API and detail UI

- Expose project-neutral FeedIndex and FeedDetail queries.
- Treat project selection as the parent scope for source and native-status
  facets. Clear incompatible child facets when the project changes; hide
  project-specific facets in the all-projects view.
- Render source badges, contributor identity, timestamps, canonical links,
  freshness, and unresolved states.
- Extract or recreate the legacy visual tokens without importing its KIP data
  contracts. Routes and component structure may be redesigned.

Evidence: A1, A5, A7, A8, A11, reference screenshots, and browser-level tests.

## Phase 5: Cited LLM overview

- Define a versioned prompt contract whose input is an explicit evidence set.
- Validate citations against that set before publishing a generated result.
- Store generation metadata and support disabled/degraded operation.

Evidence: A8-A9 plus adversarial tests for unsupported claims and invalid IDs.

## Phase 6: Iceberg handoff

- Export normalized history into versioned Iceberg tables.
- Record snapshot IDs and validate that a selected current view can be rebuilt.
- Keep Spark recommendation work outside Spec 001; use the snapshot only to
  prove the open analytical boundary.

Evidence: replay/export test required by the constitution and ADR-0003.

## Implementation discipline

For each phase:

1. select acceptance scenarios;
2. write failing tests or a repeatable verification harness;
3. implement the smallest end-to-end behavior;
4. attach commands and results to the PR;
5. update the spec or add an ADR when reality changes the decision.
