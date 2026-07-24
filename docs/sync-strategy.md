# Sync Strategy — keeping the KB fresh at full-corpus scale

> Status: PROPOSED (2026-07-26). Review pending. Supersedes the per-page polling
> cadence of `ingestion-spec.md` §2.1/§6 once the corpus backfill lands; M1's
> two-tier mechanism remains correct for the small-corpus era and stays as the
> per-page fallback.

## TL;DR(中文摘要)

1. **每日兩班同步**(03:17 / 15:17 UTC):用一句 Confluence **CQL delta 查詢**
   (`space=KAFKA AND lastmodified >= <cursor>`)問出「上次之後誰變了」——每班
   **<10 個請求**就能維持當天新鮮度,取代對 1000 頁逐頁輪詢。
2. **每月一次全量對帳**(reconciliation crawl):月初把全部頁面重爬一遍
   (~17 分鐘,politeFetch 節流),抓出 delta 理論盲區(改名、索引延遲、bug)
   累積的偏差。每日增量 + 定期全量 = Lambda 架構。
3. **Embeddings 增量重算**:per-doc content hash,只有變過的文件過模型;
   related matrix(N×N 內積)便宜,每次全量重算。換 embedding 模型 = 強制全量。
4. **全鏈路只在雲端跑**(GitHub Actions;使用者機器零參與),產物(vault、
   向量、queue)全部 commit 進 git——repo 同時是資料庫、快取、audit log。
5. 唯一未閉環的一步:自動 deploy 需要 `CLOUDFLARE_API_TOKEN` repo secret。

---

## 1. Problem

After the corpus backfill the vault holds ~1000+ KIP notes. Three things go
stale independently:

| What | Changes when | Detection cost if polled per-page |
|---|---|---|
| KIP page content | Author edits the cwiki page | ~1000 req/day (Tier-1 version checks) |
| Discussion threads | New mail on dev@kafka | ~1000 Ponymail queries/day |
| Corpus membership | A brand-new KIP is created | 1 req/day (index page) — already cheap |

M1's two-tier polling (`?expand=version` per page) is optimal for a ~10-page
follow list but scales linearly with corpus size. At 1000 pages it costs as
many requests as a full crawl — only the response bodies are smaller.

## 2. Design: server-side delta discovery (CQL)

Ask Confluence *what changed* instead of asking every page *did you change*:

```
GET /rest/api/content/search
    ?cql=space=KAFKA AND type=page AND lastmodified >= "<cursor>"
    &limit=100&expand=version
```

- `cursor` = the `syncedAt` timestamp persisted in `tools/ingest-state.json`
  (set to the *start* of the previous successful run, minus a 10-minute overlap
  margin; duplicates are already idempotent thanks to the (source, entity,
  cursor) dedupe from `ingestion-spec.md` §3).
- Typical result: 0–5 pages → re-crawl only those through the existing
  politeFetch → regenerate the affected stub/deep notes → threads lookup for
  the same KIPs only.
- Pagination: `limit=100` + `start=` — a pathological day (mass edit) costs a
  handful of pages, still bounded.

**Per-sync request budget: <10** (1–3 CQL pages + 1 index check + changed-page
fetches + their thread lookups). Freshness: same-day, twice a day.

### Cadence

```yaml
# .github/workflows/sync.yml (replaces the polling step of ingest.yml)
on:
  schedule:
    - cron: "17 3,15 * * *"   # twice daily, off the top of the hour
  workflow_dispatch:
```

The pipeline per run:

```
① CQL delta (1–3 req) ──▶ changed page list
② KIP index check (1 req) ──▶ new KIPs → tools/backfill/queue.json
③ Re-crawl changed + drain a bounded batch of queue pending (politeFetch)
④ Incremental embeddings (see §3) — only if the vault changed
⑤ bun run test  (golden queries + staleness gate = quality door)
⑥ Atomic commit: vault + vectors + state in ONE commit
⑦ Deploy (gated on CLOUDFLARE_API_TOKEN; skipped until the secret exists)
```

A no-change run short-circuits after ② in ~30s. Politeness rules of
`ingestion-spec.md` §6 apply unchanged (1 req/s + jitter, UA with contact,
429/Retry-After, backoff). Cadence can be raised (e.g. every 6h) without
materially changing upstream load — the budget is per-change, not per-page.

## 3. Incremental embedding recompute

Embeddings are per-document pure functions of the note text — no cross-document
state. Therefore:

| Step | Scope | Cost (CI) |
|---|---|---|
| Embed | **Only notes whose per-doc hash changed** | ~50ms × changed docs |
| Related matrix (top-3 neighbors) | Always full N×N dot products | <1s at N=1000 (384-dim) |
| Golden-query eval | Always full | <1s |

Mechanism: `tools/semantic/embeddings.json` manifest gains
`docs: { "KIP-42": { hash, vector } }` (per-doc sha256 of the corpus text)
replacing the single `corpusHash` as the staleness unit; the CI staleness test
compares per-doc hashes and the build script re-embeds only mismatches.

**Full-recompute triggers (non-negotiable):**
- `model` id changes — vectors from different models live in incompatible
  spaces; mixing them makes cosine meaningless.
- Corpus text-assembly rules change (`tools/semantic/corpus.ts`).

## 4. Monthly reconciliation (the safety net)

Delta discovery has theoretical blind spots: page renames, CQL index lag,
bugs in our own cursor handling. A scheduled **full re-crawl** on the 1st of
each month (`cron: "17 5 1 * *"`) re-fetches every page in the queue
(~17 min at 1 req/s), diffs against the vault, and repairs any drift —
recording what it fixed in `tools/pending-changes.json` so silent divergence
is observable.

Daily/twice-daily increments + periodic full rebuild = the Lambda architecture
(same shape LinkedIn's MUSE uses: weekly full corpus inference + daily CDC
deltas). Ours is just three orders of magnitude smaller.

## 5. Where things run and live

| Concern | Answer |
|---|---|
| Compute | GitHub Actions only (free on public repos). Nothing runs on a developer machine. |
| Storage of record | git — vault notes, vectors, queue, state, audit history in one place. |
| Public delivery | Cloudflare Pages CDN. Visitors download ~84KB (HTML+CSS+JS); vectors never ship (only the derived related lists do). Ask-AI-era vectors will ship as a lazy-loaded static binary (~1.5MB f32 / ~380KB int8) fetched only on the Ask view. |
| Why not a CF Worker + Queues crawler | Works, but costs $5/mo (Queues needs Workers Paid), duplicates the politeFetch/parsing code into a second runtime, and still needs a hop to land results in git. Reserved for a future minute-level-freshness requirement; GH Actions meets daily/half-daily freshness for $0. See ingestion-spec §5 two-track note. |

## 6. Bundle-size guard (full-corpus era)

At ~1000 stubs, `kips.generated.json` inlined into the JS bundle grows the
shipped gzip size (est. +150–250KB). Acceptance gate when the drain lands:
measure `dist/assets/*.js` gzip; if total shipped exceeds ~300KB gzip, split
the KIP data out of the bundle into a fetched static JSON (list fields first,
detail lazy) so the initial payload returns to double-digit KB.

## 7. Open items

- [ ] `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` repo secrets — closes
      the loop from "auto-commit" to "auto-deploy" (until then, prod updates on
      the next manual/CI deploy).
- [ ] Fold M2 (Jira + GitHub adapters) events into the same sync run — Jira
      already has a native delta query (`updated >= cursor` JQL), so it slots
      into the same cursor pattern.
- [ ] M3 thread-content ingestion turns Ponymail links into chunked corpus
      text; same per-doc hash mechanism covers it.
