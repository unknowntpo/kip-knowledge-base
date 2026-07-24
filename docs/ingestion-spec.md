# KIP Knowledge Base — Ingestion Spec

Status: design contract (implement against this; do not re-derive)
Scope: how upstream Apache Kafka sources are polled, normalized, linked, and
applied back into the vault (`vault/KIPs/KIP-*.md`), which remains the single
source of truth. An implementer should be able to code M1 from this document
without re-asking.

Guiding principle: **the KB is a reference tool — prefer stale over wrong.**
Deterministic metadata is applied by machine; generated prose always lands as a
human-reviewed PR.

---

## 1. Architecture

```
                        GitHub Actions cron (polling; no webhooks from Apache infra)
                                          │
        ┌───────────────┬─────────────────┼──────────────────┬────────────────┐
        ▼               ▼                 ▼                  ▼                │
  ┌───────────┐   ┌───────────┐    ┌────────────┐     ┌────────────┐         │
  │ Confluence│   │   Jira    │    │  GitHub    │     │ Mailing    │  SOURCES │
  │ adapter   │   │  adapter  │    │  adapter   │     │ list (Pony │ (adapters)
  │ (cwiki)   │   │ (issues.) │    │ (apache/   │     │  mail)     │         │
  │           │   │           │    │  kafka)    │     │            │         │
  └─────┬─────┘   └─────┬─────┘    └─────┬──────┘     └─────┬──────┘         │
        │ polite fetch  │                │                  │                │
        └───────────────┴──────┬─────────┴──────────────────┘                │
                               ▼                                             │
                    ┌──────────────────────┐                                 │
                    │  Normalized Change    │  ChangeEvent[]  (append-only)   │
                    │  Feed  (§3)           │  dedupe by (source,entity,cursor)
                    └──────────┬───────────┘                                 │
                               │                                             │
              ┌────────────────┼──────────────────┐                          │
              ▼                                    ▼                          │
     ┌─────────────────┐                 ┌──────────────────┐                │
     │ Linking layer    │  lateral        │  Apply Engine    │               │
     │ (regex edges)    │◄───graph────────│  (§5)            │               │
     │ graph.json (§4)  │                 │                  │               │
     └────────┬─────────┘                 │  deterministic ──┼─► direct commit (CI)
              │                           │  generative ─────┼─► PR (human review)
              ▼                           └──────────────────┘               │
     ┌─────────────────┐                            │                        │
     │ code graph (M4) │   symbol/config-key match  ▼                        │
     │ code: links     │                   vault/KIPs/KIP-*.md  ◄────────────┘
     └─────────────────┘                   (frontmatter + prose)
                                                    │
                                                    ▼
                                          parse-vault.ts → viewer / Ask AI
```

State: `tools/ingest-state.json` (cursors + per-KIP pageId/version map).
Sidecars: `tools/graph.json` (edges), `tools/pending-changes.json` (drift queue,
M1). Raw payload snapshots referenced by `payloadRef` live under
`tools/ingest-cache/` (git-ignored).

---

## 2. Sources & mechanisms

All adapters implement one interface:

```
poll(state) -> { events: ChangeEvent[], nextState }
```

Adapters are pure w.r.t. the network boundary: `fetch` is injected so tests can
mock it. Adapters never write the vault — they only emit ChangeEvents and update
their slice of state. Only the Apply Engine touches `vault/`.

### 2.1 Confluence (cwiki.apache.org, space `KAFKA`)

KIP body pages. Two-tier polling to keep per-poll cost near-zero when nothing
changed. `version.number` is the ETag equivalent — the cursor we compare.

- **Tier 1 (cheap, every poll):**
  `GET /confluence/rest/api/content/{pageId}?expand=version`
  Compare `version.number` against `state.confluence.pages[kipId].version`.
  No change → emit nothing.
- **Tier 2 (only when Tier 1 shows a bump):**
  `GET /confluence/rest/api/content/{pageId}?expand=body.storage,version`
  Full storage-format body → snapshot to cache, emit `updated` (or
  `status_changed` if the parsed status differs).

**Page-id discovery** (once per KIP, then cached in state):
`GET /confluence/rest/api/content?spaceKey=KAFKA&title=<exact title>`.
Fallback when the exact title is unknown/renamed — CQL search:
`GET /confluence/rest/api/content/search?cql=title~"KIP-500"`.
Persist the resolved `pageId` so discovery is not repeated.

### 2.2 Jira (issues.apache.org/jira)

Public REST v2, incremental by `updated` watermark.

- `GET /jira/rest/api/2/search?jql=<jql>&startAt=<n>&maxResults=50&fields=key,status,summary,issuelinks,updated`
- JQL: `project = KAFKA AND updated >= "<cursor>" ORDER BY updated ASC`
- Paginate on `startAt` until `startAt + maxResults >= total`.
- Cursor = max `updated` seen (store as Jira's `yyyy-MM-dd HH:mm` form).
- Extract: issue key, status, summary, `issuelinks`. Emit `status_changed` when
  status differs from state, else `updated`; `linked` for new issue links.

### 2.3 GitHub (apache/kafka)

Merged PRs, commits, releases via REST (token = `GITHUB_TOKEN`, 5k req/h).

- PRs: `GET /repos/apache/kafka/pulls?state=closed&sort=updated&direction=desc&per_page=50`
  (filter `merged_at != null`, stop at cursor).
- Releases: `GET /repos/apache/kafka/releases`.
- Cursor = last processed `updated_at` / release id.
- **Linking convention** (regex extraction from titles/bodies/commit messages):
  - Jira key: `/\bKAFKA-\d+\b/g`
  - KIP mention: `/\bKIP-\d+\b/g`
  Emit `linked` events tying `pr` → `kipId` / `jiraKey`.

### 2.4 Mailing list (lists.apache.org — Ponymail API)

DISCUSS / VOTE threads on `dev@kafka.apache.org`, matched by `KIP-\d+` in the
subject.

- Thread list: Ponymail JSON API scoped to list `dev@kafka.apache.org`, ordered
  by date; cursor = last thread epoch.
- Match subjects against `/\bKIP-\d+\b/` and `\[(DISCUSS|VOTE)\]` prefix.
- Emit `linked` (thread ↔ kipId). VOTE threads additionally feed the vote-tally
  deterministic field once closed.

---

## 3. ChangeEvent schema

Append-only normalized feed. One event = one observed atomic change.

```jsonc
{
  "id":        "string",          // stable hash of (source, entity, cursor, kind)
  "source":    "confluence" | "jira" | "github" | "list",
  "entity": {
    "kipId":   "KIP-500",         // optional
    "jiraKey": "KAFKA-12345",     // optional
    "pr":      12345,             // optional (GitHub PR number)
    "threadId":"string"           // optional (Ponymail thread id)
  },
  "kind":      "created" | "updated" | "status_changed" | "linked",
  "cursor":    "string",          // source-specific watermark at observation
                                  //  confluence: version.number
                                  //  jira: updated timestamp
                                  //  github: updated_at / id
                                  //  list: thread epoch
  "url":       "https://…",       // canonical human URL for the change
  "observedAt":"2026-07-20T00:00:00Z",  // ingestion wall clock (ISO-8601)
  "payloadRef":"tools/ingest-cache/confluence/KIP-500.v37.json"  // raw snapshot
}
```

**Dedupe key:** `(source, entity, cursor)`. Re-observing the same tuple is a
no-op — this is what makes reruns idempotent.

---

## 4. Linking layer

Regex-derived edges only — **no ML**. Edge types:
`KIP ↔ Jira`, `KIP ↔ PR`, `KIP ↔ thread`, `Jira ↔ PR`.

Stored two ways:

1. **Sidecar** `tools/graph.json` — the machine-readable graph:
   ```jsonc
   {
     "nodes": [ { "id": "KIP-500", "type": "kip" }, … ],
     "edges": [ { "from": "KIP-500", "to": "KAFKA-9119", "type": "kip-jira", "src": "github", "url": "…" }, … ]
   }
   ```
2. **Write-back into note frontmatter** (deterministic, so machine-applied):
   `jira: ["KAFKA-9119"]`, `prs: [10251, 12345]`. These new keys are additive;
   `parse-vault.ts` ignores unknown frontmatter today, so adding them is
   backward-compatible. The viewer surfaces them once the parser is extended.

Edges are derived, never authored by hand; regenerating from the feed must
reproduce `graph.json` byte-for-byte (deterministic ordering: sort nodes/edges).

---

## 5. Apply Engine — deterministic vs generative (the key decision)

The two paths are **strictly separated**. This separation is the safety
guarantee of the whole system.

| Path | What it writes | How | Who reviews |
|------|----------------|-----|-------------|
| **Deterministic** | frontmatter metadata: cwiki `version` + `url`, `status`, `release`, `jira`/`prs` links, vote tally | machine writes note, CI commits directly to `main` | none needed (mechanical, reversible) |
| **Generative** | prose: discussion summaries, motivation/design updates | LLM drafts → **always a PR** | human, before merge |

Rules:

- A generated-prose change **never** commits directly. It opens a PR with the
  diff and a provenance note (which ChangeEvents/threads drove it).
- Deterministic writes are idempotent: applying twice yields the same file.
- If a change is ambiguous between the two, treat it as generative (route to PR).
- Conflict policy: prefer stale over wrong. If a deterministic value can't be
  parsed with confidence, leave the existing value and record drift instead.

---

## 6. Politeness rules (non-negotiable — enforced in code)

- **Rate:** ≤ 1 request/second per host, with random jitter.
- **Concurrency:** ≤ 2 in-flight requests total.
- **User-Agent:** descriptive, with a contact URL, e.g.
  `kip-knowledge-base/1.0 (+https://github.com/unknowntpo/kip-knowledge-base)`.
- **robots.txt:** fetch and honor per host.
- **Backpressure:** honor `429` + `Retry-After`; exponential backoff on `5xx`
  (base 1s, cap 60s, full jitter, max 5 attempts).
- **Caching:** send `If-None-Match` / handle `304 Not Modified` where the host
  supports it (Confluence Tier-1 leans on `version.number` instead).
- **Follow list only:** poll **only** the follow list — currently the 9 seeded
  KIPs (KIP-98, 101, 227, 392, 405, 500, 679, 848, 932). Never enumerate the
  whole space.
- **Cadence by status:** `Under Discussion` → daily; `Adopted` → weekly.
  (Cadence is enforced by the cron schedule + a per-KIP `nextPollDue` in state.)
- **Never bulk-crawl** the wiki, Jira, or the mailing list archive.

These are implemented as a shared `politeFetch` wrapper that every adapter must
use; adapters may not call `fetch` directly.

---

## 7. Per-adapter reference tables

### Endpoints & cursors

| Adapter | Primary endpoint | Cursor | Change detection |
|---------|------------------|--------|------------------|
| Confluence | `/rest/api/content/{pageId}?expand=version` (T1); `…?expand=body.storage,version` (T2) | `version.number` | version bump |
| Jira | `/rest/api/2/search?jql=…&startAt=&maxResults=50` | max `updated` | `updated >= cursor` |
| GitHub | `/repos/apache/kafka/pulls?state=closed&sort=updated`; `/releases` | last `updated_at` / release id | `merged_at`, newer `updated_at` |
| Mailing list | Ponymail thread API for `dev@kafka.apache.org` | last thread epoch | new/updated thread |

### Cadence & cost per poll

| Adapter | Cadence | Requests / poll (steady state) | Notes |
|---------|---------|--------------------------------|-------|
| Confluence | daily (Under Discussion) / weekly (Adopted) | 1 T1 req/KIP; +1 T2 only on change | 9 KIPs → ~9 cheap reqs/day |
| Jira | daily | 1 + ceil(N/50) pages | usually 1–2 pages |
| GitHub | daily | 1–2 (PRs page + releases) | 5k/h token budget, ample |
| Mailing list | daily | 1–2 (thread list + hydrate matches) | subject-filtered |

Total steady-state footprint: ~15–20 requests/day — well within polite limits.

---

## 8. Milestones

- **M1 — Confluence + deterministic frontmatter + drift flagging.**
  Two-tier Confluence polling; apply deterministic frontmatter (`version`,
  `url`, `status`, `release`). Changed pages are recorded in
  `tools/pending-changes.json` — **no prose rewrite yet**. Drift = a Tier-2
  body change whose prose implications need review.
- **M2 — Jira + GitHub adapters + linking layer.**
  Add both adapters, build `graph.json` + frontmatter `jira`/`prs` write-back,
  extend the viewer to surface links.
- **M3 — Apply Engine generative path.**
  LLM drafts discussion/design summaries from the feed → opens a PR. Never a
  direct commit. Provenance recorded in the PR body.
- **M4 — Code entity linking + graph-fed Ask AI.**
  Extract symbols / config keys (`RemoteStorageManager`, `enable.idempotence`)
  from KIP text; match against a ctags/tree-sitter symbol index of `apache/kafka`;
  emit `code:` links (GitHub URL + path). Graph feeds Ask AI as GraphRAG-style
  hybrid retrieval (MiniSearch lexical + build-time embeddings + graph edges),
  LLM synthesis via a Cloudflare Pages Function. **Entity linking only** — full
  call-graph / SCIP is explicitly out of scope.

### M4 — MUSE-inspired practices

Retrieval quality for the embeddings half of the hybrid retriever is guarded by
practices adapted from MUSE-style evaluation. Semantic v1 (`tools/semantic/`)
implements the first three; the LLM-as-judge extension is deferred.

- **Golden-query regression harness.** `tools/semantic/golden-queries.json` pairs
  natural-language queries with the KIP(s) that should answer them.
  `build-embeddings.ts` embeds each query into `golden-embeddings.json`; the CI
  test (`viewer/test/semantic.test.ts`) scores each query against the committed
  doc vectors with **deterministic cosine** (dot product on normalized vectors)
  and asserts an expected KIP lands in the top-3. No model download and no network
  in CI. An **LLM-as-judge** extension (grading answer relevance beyond top-k
  membership) is deferred until an API key is available in CI.
- **Asymmetric `query:` / `passage:` prefixes.** The e5 model family is trained
  asymmetrically: documents are embedded as `"passage: <text>"` and queries as
  `"query: <text>"`. Both the build script and the golden harness follow this
  convention; mixing them up silently degrades recall.
- **Relevance rubric.** A single ordering shared by the golden harness today and
  by future Ask AI synthesis + judging:
  **direct answer** (the KIP that resolves the query) > **dependency / mechanism**
  (a KIP the answer builds on or that shares the underlying mechanism) > **same
  topic area** (same category, no causal link). Top-3 membership is the current
  proxy for "direct answer or one hop away."

Semantic artifacts (`embeddings.json`, `related.json`, `golden-embeddings.json`)
are **committed** and regenerated on any vault change via
`cd viewer && bun run embeddings`. A **staleness-guard** test hashes the live
vault corpus and compares it to `embeddings.json.corpusHash`, failing with the
exact regen command if the two drift — so stale vectors cannot merge.

---

## 9. M1 acceptance criteria

1. **Runnable dry-run:** `bun tools/ingest/run.ts --dry-run` performs a full
   Confluence poll, prints the ChangeEvents and the frontmatter diffs it *would*
   apply, and writes nothing to `vault/`.
2. **Unit-tested with mocked fetch:** adapters take an injected `fetch`; tests
   cover (a) no-change Tier-1 short-circuit, (b) version bump → Tier-2 fetch +
   `updated` event, (c) page-id discovery + CQL fallback, (d) dedupe by
   `(source, entity, cursor)`.
3. **GitHub Actions cron workflow:** a scheduled workflow
   (`.github/workflows/ingest.yml`) runs the poll on the daily/weekly cadence,
   commits deterministic frontmatter changes, and updates
   `tools/pending-changes.json`. Reuses the existing test-then-act CI discipline.
4. **Idempotent:** running the ingest twice with no upstream change produces no
   commit and no state churn.
5. **Politeness enforced in code:** all network access goes through the shared
   `politeFetch` (rate ≤1/s + jitter, concurrency ≤2, UA with contact URL,
   robots.txt, 429/Retry-After, 5xx backoff, follow-list-only). Verified by a
   unit test asserting adapters cannot bypass it.
6. **Drift recorded, not rewritten:** a Tier-2 body change lands in
   `tools/pending-changes.json` with `{ kipId, fromVersion, toVersion, url,
   observedAt }`; prose in the note is left untouched.

---

## 10. Corpus backfill (implemented — tools/backfill/)

Imports the FULL KIP corpus (every status) as stub notes, queue-style.

- **Discovery:** the cwiki index page ("Kafka Improvement Proposals", space
  KAFKA) is fetched (2 req) and every `KIP-\d+` link extracted → merged into
  `tools/backfill/queue.json` (committed; per-item state machine
  `pending → detail_done → threads_done | failed`; merge preserves existing
  states and adopts pageIds already recorded in vault notes).
- **Runner:** `bun tools/backfill/run.ts [--dry-run|--limit N|--no-threads]` —
  politeFetch-throttled; checkpoints the queue after every item; failures are
  recorded with the error and never bulk-retried. CI entry:
  `.github/workflows/backfill.yml` (test → crawl → regenerate embeddings →
  re-test → atomic commit).
- **Page resolution (prefer skip over wrong):** exact title `"KIP-N: <title>"`
  in space KAFKA first, then CQL `space = KAFKA AND title ~ "KIP-N"` keeping
  only results whose title starts at a `KIP-N` word boundary (so KIP-11 never
  resolves to KIP-110, and same-named pages in other spaces — e.g. Knox — are
  excluded). Unresolvable → `failed`, not a wrong import.
- **Status normalization** (raw "Current state:" text → canonical):
  | Canonical | Raw variants (case-insensitive substring) |
  |---|---|
  | `Adopted` | adopted, accepted, released, implemented, completed |
  | `Early Access` | early access, preview |
  | `Under Discussion` | under discussion, discussion, draft, voting, wip |
  | `Discarded` | discarded, rejected, superseded, withdrawn, abandoned, inactive, moved |
  | `Unknown` | anything unparseable (kept honest rather than guessed) |
- **Stub note contract:** frontmatter `stub: true`, `status`, `cwiki` block,
  optional `threads:` (Ponymail permalinks + counts), empty `tags`/`related`;
  body = extracted Summary + a callout linking the cwiki page. The vault parser
  runs lenient for `stub: true` notes (deep-only fields default to empty) while
  the 9 deep notes keep their byte-exact seed round-trip.
- **Steady-state freshness** after the initial drain is governed by
  `docs/sync-strategy.md` (CQL delta, twice-daily cron, monthly reconciliation).
