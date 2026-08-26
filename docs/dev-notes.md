# Development Notes

Short factual notes discovered while implementing active specs belong here.
Durable cross-feature decisions belong in ADRs; requirements belong in specs.

## 2026-08-17 — SDD control plane introduced

- The current repository is KIP-centric at both `viewer/src/types.ts` and
  `tools/ingest/types.ts`.
- Existing ingestion already provides useful invariants: append-oriented change
  events, deterministic dedupe, source payload references, strict separation of
  deterministic and generative writes, and the stale-over-wrong policy.
- The README and ingestion spec describe the legacy vault system, not a target
  compatibility contract.
- Spec 001 deliberately excludes recommendation work. Its purpose is to prove
  the evidence, replay, provenance, and project-neutral boundaries first.

## 2026-08-17 — Greenfield boundary confirmed

- Only the existing frontend visual language needs to be preserved.
- Vault storage, `Kip` and `ChangeEvent` schemas, parsers, ingestion jobs,
  generated JSON, APIs, routes, and build pipeline may be replaced freely.
- New acceptance scenario A11 checks visual continuity without importing legacy
  data contracts.

## 2026-08-18 — Adapter terminology corrected

- `Kafka adapter` was ambiguous with Fluss's Kafka wire-protocol compatibility
  module and is no longer used for the community ingestion boundary.
- Reusable `GitHubConnector`, `JiraConnector`, `ConfluenceConnector`, and
  `MailingListConnector` components handle source systems.
- `KafkaCommunityProfile` handles KIP, KAFKA Jira, repository, and mailing-list
  conventions. Future `FlinkCommunityProfile` and `SparkCommunityProfile`
  implementations reuse the connectors.
- The primary Fluss integration uses native Fluss/Flink interfaces. Kafka
  protocol compatibility is optional while upstream documents it as in
  development.

## 2026-08-21 — Vue and Cloudflare R2 serving POC

- The active UI is now Vue 3 + Vite + TypeScript; accepted Feed and FeedDetail
  domain contracts remain unchanged.
- Cloudflare Pages Functions read a private local R2 binding. Feed index and
  FeedDetail objects are versioned and `current.json` is published last.
- Real GitHub CLI data produced eight Kafka/DataFusion Feed entries and eight
  independently hydrated FeedDetail objects in the local Wrangler proof.
- Wrangler object commands URL-decode percent escapes in object paths. The
  projection therefore uses a stable underscore escape for FeedEntry IDs rather
  than percent-encoded object names.
- The isolated cloud proof is deployed at
  `https://oss-knowledge-base-poc.pages.dev`; it does not modify the existing
  `kip-knowledge-base` Pages project or either Locus R2 bucket.

## 2026-08-25 — Feed serving boundary cleanup

- `FeedIndex → FeedDetail` is now the only public serving path. The former
  TopicPage, DecisionStory, FeedStory, FeedTopic, and embedded `items` shapes
  are no longer executable contracts.
- FeedRecordGroup remains an internal, replayable grouping result. Its behavior
  oracle now lives under Feed grouping tests and includes Kafka, DataFusion,
  Flink, Spark, mailing-list-only, and Slack cases.
- Active code ownership is split into web, GitHub publisher, domain, and serving
  contract workspaces; the Vue frontend no longer imports publisher internals.
- R2 schema v2 rejects index/detail membership mismatch before publication and
  publishes `public/v2/current.json` last.
- A real GitHub export produced eight entries and ten R2 objects. Desktop,
  mobile, and production-like Pages Functions → local R2 browser checks loaded
  FeedDetail without console errors or failed requests.

## 2026-08-25 — Replayable GitHub reference pipeline

- GitHub polling now emits versioned `DomainEventV1` values and a candidate
  checkpoint; the controller, not the connector, commits progress.
- The TypeScript reference state validates a complete next log atomically and
  serializes restart fixtures. It is a correctness harness, not production
  durability; Fluss remains the next durable event boundary.
- The reference materializer is deterministic for explicit events,
  configuration, and materialization time. Its v1 oracle digest is
  `sha256:cecea8b974520ab3185e0f3ea944642890d24429601595028fd7bc02eb618c36`.
- `gh api --cache` was removed from concurrent connector calls because the CLI
  cache produced malformed cached JSON under bounded concurrency. Polling,
  checkpoints, overlap dedupe, refresh intervals, and failure cooldown provide
  request control instead.
- R2 publication now uploads immutable release objects with bounded concurrency
  and writes `public/v2/current.json` separately and last.
- Public release `2026-08-25T08-29-41-122Z` contains 184 Feed entries and 353
  current GitHub source records from Kafka and DataFusion. Feed, lazy detail,
  desktop, and mobile browser checks completed without console errors or failed
  requests at `https://oss-knowledge-base-poc.pages.dev`.

## 2026-08-25 — Evidence Search serving slice

- Search now publishes an independent immutable R2 release and updates
  `public/search/v1/current.json` last. `/api/search` returns evidence excerpts
  and an opaque revision-bound `detailRef` that hydrates the existing
  `FeedDetail` contract.
- Project status is derived once from the group root `SourceRecord` and stored
  as Search projection metadata. Status filters require exactly one project;
  unsupported statuses produce no synthetic match.
- `occurredAfter` and `occurredBefore` are strict bounds on matching evidence
  timestamps. They are not computed from a synthetic group timestamp.
- `bun run measure:search` measures the complete in-memory R2 contract path. On
  the accepted 10-chunk fixture it observed 29,651 release bytes, a 9,733-byte
  largest lexical shard, and 0.836 ms p95 over 100 × 3 searches on this machine.
  This is a reproducible local baseline, not a Cloudflare production SLA.
- Desktop and mobile visual observations contain no console errors, page
  errors, or failed requests. Artifacts are under
  `/tmp/osskb-search-filters-desktop` and
  `/tmp/osskb-search-filters-mobile`.

## 2026-08-26 — Phase 1 performance gate deferred

- The account dashboard confirms active Workers Paid and R2 Paid subscriptions.
- Phase 1 does not run a public load benchmark and has no numerical shard-size
  or latency release gate. Current values remain observable telemetry.
- A minimal public functional smoke is allowed only after an explicit
  deployment. It is not scheduled and must not retry as a load test.
- Shard splitting, caching, or a replaceable `SearchRetriever` becomes a new
  decision only after observed latency, CPU, size, error, or cost pressure, or
  before a materially larger corpus is published.

## 2026-08-26 — Evidence Search public POC released

- Guarded publisher `bun run search:publish` defaults to dry-run, applies a
  source-specific write safety cap, uploads immutable objects with concurrency
  four, and writes the Search current pointer last. It never changes the Feed
  current pointer.
- Public Search release `poc-2026-08-26T03-25-08-702Z` contains 11 objects and
  29,753 bytes in the isolated `oss-knowledge-base-poc` R2 bucket.
- Deployment `https://d1951817.oss-knowledge-base-poc.pages.dev` updated the
  stable `https://oss-knowledge-base-poc.pages.dev` Pages project and Functions.
- The bounded API smoke made two requests: `KIP-405` returned two results and
  its immutable `detailRef` hydrated three source records with
  `reason.kind = search-match`.
- One public Chromium interaction opened Search → FeedDetail with three
  timeline records and zero console errors, page errors, or failed requests.
  Evidence is stored in `/tmp/osskb-public-search-smoke/summary.json` and
  `/tmp/osskb-public-search-smoke/detail.png`. No load or latency benchmark ran.

## 2026-08-26 — Complete recorded Feed snapshot indexed

- A deterministic `FeedPublication` → `SearchPublicationV1` materializer now
  requires explicit revisions and time, rejects incomplete membership and
  cross-group record reuse, and performs no GitHub, R2, LLM, or other network
  calls. The local R2 seed loader is only the POC adapter.
- Public Search release `feed-2026-08-25T08-29-41-122Z` contains all 184 Feed
  groups and 353 current Kafka/DataFusion `SourceRecord` views as 353 chunks in
  two project shards. The 188-object release is 1,345,271 bytes; its largest
  object is 478,626 bytes. These values are telemetry, not release gates.
- Publication wrote 187 immutable objects before the Search current pointer.
  It did not refetch GitHub and did not change the Feed current pointer.
- Public API smoke was fixed at three requests: `KAFKA-20983` exactly matched
  Kafka PR 23265, `Dictionary Encoding` matched DataFusion issue 24111 with
  four source excerpts, and the Kafka immutable `detailRef` hydrated its same
  one-record `FeedDetail`.
- Typecheck, production build, 74 unit/integration tests, and four desktop/mobile
  E2E tests passed. No load or latency benchmark ran. Existing Chrome could not
  be attached for an additional public interaction because its explicit remote
  debugging approval was not granted; no retry or alternate browser bypass was
  attempted.
- Coverage is complete for the 353 retained views, not full upstream bodies or
  complete GitHub history. Many connector excerpts are deliberately bounded;
  widening retained source content is a later acquisition decision.

## 2026-08-26 — Main/tag Pages promotion prepared

- ADR-0008 defines pull requests as CI-only, `main` as development promotion,
  and SemVer `v*` tags reachable from `main` as production promotion.
- The local workflow retains the exact CI-built `apps/web/dist` artifact,
  removes the legacy `viewer/` deploy, and keeps code deployment separate from
  Feed/Search R2 publication.
- Cloudflare Pages projects `oss-knowledge-base-dev` and `oss-knowledge-base`
  now exist without a first deployment. GitHub environments `development` and
  `production` plus the `CLOUDFLARE_ACCOUNT_ID` secret also exist.
- A scoped `CLOUDFLARE_API_TOKEN`, the first PR CI run, shared read-only R2
  binding verification, and `main` protection remain pending. The local
  typecheck and production build pass.
- Feed card footer misalignment is recorded as a separate visual-polish task:
  pin the footer to the card bottom and assert same-row desktop baselines.
