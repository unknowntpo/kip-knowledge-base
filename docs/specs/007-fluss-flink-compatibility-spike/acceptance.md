# Spec 007 Acceptance Scenarios

Status: Compatibility harness implemented; cluster-backed slice pending

## Implementation progress

- C1 and C2 are automated in `spikes/fluss-flink-compat` and CI.
- C3 gate mechanics and mismatch rejection are automated in
  `packages/reference-pipeline`.
- C4-C7 require the next cluster-backed vertical slice.

## C1 — Released artifacts resolve together

**Given** Java 17 or newer  
**When** the isolated Maven spike resolves its pinned dependencies  
**Then** Flink 1.20.3 and `fluss-flink-1.20` 0.9.1-incubating load without an
unreleased Fluss checkout or mutable version range.

## C2 — Flink discovers the Fluss catalog

**Given** the pinned runtime classpath  
**When** Flink discovers catalog factories by identifier  
**Then** `fluss` resolves to `org.apache.fluss.flink.catalog.FlinkCatalogFactory`.

## C3 — The semantic gate fails closed

**Given** the accepted Spec 004 oracle and a candidate projection  
**When** either declared digest is invalid or canonical output differs  
**Then** the parity command fails and reports both computed identities  
**And** exact canonical equality returns the accepted digest.

## C4 — Canonical events survive Fluss replay

**Given** a fresh run-owned Fluss Log Table  
**When** the recorded events are inserted twice and read from the beginning  
**Then** all observations remain replayable  
**And** deterministic event identity prevents duplicate logical output.

## C5 — Flink materializes current state

**Given** out-of-order and duplicate fixture observations  
**When** the Flink job writes the run-owned Primary Key Table  
**Then** current entity status, ordering, grouping, provenance, and activity
match the TypeScript oracle.

## C6 — Restart and retry are safe

**Given** a job interruption after a bounded subset of events  
**When** the same run resumes or replays from the Log Table  
**Then** the final candidate matches a clean run  
**And** no serving pointer or source checkpoint advances on partial output.

## C7 — Independent candidate passes parity

**Given** the completed Flink materialization  
**When** it exports `osskb.reference-projection.v1`  
**Then** the parity gate returns
`sha256:cecea8b974520ab3185e0f3ea944642890d24429601595028fd7bc02eb618c36`  
**And** the evidence records the pinned versions, run identity, input digest,
candidate path, duration, and cleanup result.

## Evidence layers

- **Classpath smoke:** C1-C2, fast and cluster-free on every pull request.
- **Gate unit/integration:** C3, recorded fixture only and no external writes.
- **Cluster integration:** C4-C6, explicit isolated runner with readiness and
  cleanup evidence.
- **Parity evidence:** C7, candidate must come from the Flink job rather than a
  copied oracle.
