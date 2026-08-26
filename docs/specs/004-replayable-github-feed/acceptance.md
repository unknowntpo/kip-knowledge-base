# Spec 004 Acceptance Scenarios

Every scenario uses fixed event IDs and timestamps. Evidence must be produced
by repeatable tests; a screenshot or one successful live poll is not sufficient
for replay correctness.

## G1 — GitHub payload becomes a valid domain event

**Given** a fixed GitHub issue, pull request, and comment payload  
**When** the GitHub connector normalizes them  
**Then** every result passes the `DomainEventV1` runtime parser  
**And** preserves project, source instance, entity identity, source cursor,
canonical URL, source timestamp, connector/profile revisions, and payload
reference.

## G2 — A repeated poll is idempotent

**Given** the same upstream revision is observed in two polls with different
`observedAt` values  
**When** both event batches are replayed  
**Then** the logical event set contains one revision  
**And** Feed activity is counted once  
**And** the Feed projection equals the projection from either poll alone.

## G3 — Restart resumes from a committed checkpoint

**Given** a completed batch and its committed connector checkpoint  
**When** the controller state is serialized, reconstructed, and polling resumes  
**Then** the connector receives the same committed checkpoint  
**And** overlapping events do not create duplicate SourceRecords or activity  
**And** an uncommitted candidate checkpoint is never treated as committed.

## G4 — Out-of-order delivery produces the same timeline

**Given** multiple revisions and a late comment delivered in different orders  
**When** each input ordering is materialized with the same time and revisions  
**Then** FeedEntry, FeedDetail, status, activity evidence, and newest-first
timeline are logically identical.

## G5 — Replay output is canonically comparable

**Given** one versioned event fixture and fixed materialization configuration  
**When** it is replayed twice in clean processes  
**Then** canonical Feed and FeedDetail JSON is byte-identical  
**And** a recorded digest is identical  
**And** this fixture and digest are reusable by the future Flink parity test.

## G6 — Conflicting duplicate identity fails closed

**Given** two normalized events with the same dedupe identity but different
logical facts  
**When** the batch is validated  
**Then** the conflict is rejected and observable  
**And** the connector checkpoint is not advanced  
**And** no new R2 manifest becomes current.

## G7 — Partial GitHub fetch does not publish or advance

**Given** one source page succeeds and a later page fails  
**When** the polling controller handles the result  
**Then** the batch is incomplete  
**And** its candidate checkpoint is not committed  
**And** the last complete R2 release remains current.

## G8 — Rate limit or GitHub outage serves stale data

**Given** a previously published complete release  
**And** GitHub responds with a rate-limit or transport failure  
**When** a scheduled refresh runs  
**Then** the controller records the failure and retry boundary  
**And** does not create a retry storm  
**And** Pages Functions continue serving the previous Feed and FeedDetail.

## G9 — Provenance survives Feed materialization

**Given** normalized Kafka and DataFusion GitHub events  
**When** FeedEntry and FeedDetail are materialized  
**Then** every SourceRecord retains its canonical URL, source revision, author,
and occurred-at time  
**And** every activity reason and key point cites contained event or record IDs.

## G10 — Project boundaries remain isolated

**Given** Kafka and DataFusion events with similar titles and overlapping
upstream numeric IDs  
**When** the Feed is materialized  
**Then** no FeedDetail contains records from more than one project  
**And** namespaced source identities prevent collisions.

## G11 — Existing serving contract remains unchanged

**Given** a projection produced by the reference materializer  
**When** the existing R2 projection builder publishes it  
**Then** immutable Feed and FeedDetail objects are written before
`current.json`  
**And** `/api/feed` remains bounded  
**And** `/api/detail/:id` lazily returns the complete detail  
**And** the existing Vue Feed-to-Detail interaction requires no contract
translation.

## G12 — Live smoke test uses real GitHub evidence

**Given** an authenticated `gh` CLI and available rate limit  
**When** the live smoke test polls Kafka and DataFusion  
**Then** at least one real entry per project reaches the event boundary and
FeedDetail  
**And** every displayed source link points to the matching Apache GitHub
repository.

This smoke test proves integration only. G1-G11 remain deterministic fixtures
and are the release gate.

## Implementation evidence — 2026-08-25

| Gate | Executable evidence | Result |
| --- | --- | --- |
| G1, G7 | `apps/github-publisher/test/github-connector.test.ts` | Pass |
| G2, G4, G5, G9, G10 | `packages/reference-pipeline/test/reference-materializer.test.ts` | Pass |
| G3, G6, G7, G8, G11 | `apps/github-publisher/test/pipeline-controller.test.ts` | Pass |
| G8 retry boundary | `apps/github-publisher/test/feed-poller.test.ts` | Pass |
| G11 Pages/R2 read boundary | `apps/web/test/r2-functions.test.ts` | Pass |
| G12 | `RUN_LIVE_GITHUB_TEST=1 bun test apps/github-publisher/test/live-feed.integration.test.ts` | Pass |

Release commands:

```bash
bun run test
bun run typecheck
bun run build
RUN_LIVE_GITHUB_TEST=1 bun test apps/github-publisher/test/live-feed.integration.test.ts
```

The canonical fixture digest is
`sha256:cecea8b974520ab3185e0f3ea944642890d24429601595028fd7bc02eb618c36`.
The public Feed → lazy FeedDetail proof is deployed at
https://oss-knowledge-base-poc.pages.dev. Desktop, 390 px mobile, console,
runtime errors, and failed requests were checked after deployment.

## Accepted review decisions

- Confirm that `DomainEventV1`, rather than a new event synonym, is the input
  contract.
- Confirm that checkpoint commitment belongs to the controller, not the
  connector or R2 publisher.
- Confirm that the TypeScript event fixture is an oracle, not the production
  event store.
- Confirm that Fluss/Flink cutover is a later stage with output parity, not part
  of this spec.
- Confirm that no LLM path is required for any acceptance scenario.
