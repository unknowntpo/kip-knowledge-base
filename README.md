# KIP Knowledge Base

A searchable knowledge base for **Apache Kafka Improvement Proposals (KIPs)**,
stored as an **Obsidian vault** and browsable two ways:

1. **In Obsidian** — open [`vault/`](vault) as a vault. Notes, tags, wikilinks,
   graph and backlinks all work natively.
2. **In the web viewer** — a React + TypeScript SPA in [`viewer/`](viewer) that
   parses the same vault and renders Browse, KIP detail, and (soon) Ask AI views.

The vault is the **single source of truth**; the viewer derives its data from it.

## Repository layout

```
vault/                  Obsidian vault (source of truth)
  KIPs/KIP-*.md         one note per KIP — frontmatter metadata + body sections
  KIPs.md               index / map of content
  .obsidian/            shared vault config
viewer/                 "our own viewer" — React + TS + Vite SPA
  scripts/parse-vault.ts    vault markdown -> structured KIP model (typed)
  scripts/build-kips.ts     writes src/data/kips.generated.json (pre dev/build)
  src/                      TopBar, Browse, Detail, Ask views (routes /, /kip/:id, /ask)
  test/parse.test.ts        round-trips the vault losslessly against the seed
tools/kips.seed.json    canonical import snapshot (provenance + parser fixture)
.github/workflows/      Cloudflare Pages deploy for the viewer
```

## KIP note format

Each `vault/KIPs/KIP-*.md` is a normal Obsidian note:

```markdown
---
id: "KIP-500"
title: "Replace ZooKeeper with a Self-Managed Metadata Quorum"
status: "Adopted"
category: "Cluster Architecture"
release: "2.8 (EA) → 3.3 (prod)"
authors: ["Colin McCabe", "Jason Gustafson"]
tags: ["KRaft", "Metadata", "Controller", "Scalability"]
related: ["[[KIP-405]]", "[[KIP-848]]"]
---

## Summary
…
## Motivation
…
## Proposed Changes / Design
…
## Trade-offs
> [!success]+ Benefits
## Rejected Alternatives
## Discussion Thread
## Voting Thread
```

The parser reconstructs the structured model (motivation, design, pros/cons,
rejected alternatives, discussion messages, votes) from these conventions. The
`test/parse.test.ts` round-trip guarantees the markdown is a lossless encoding.

## Running the viewer

Tooling is **Bun** (package manager + TS runtime); the `.ts` scripts run without a
build step. Install Bun once: `curl -fsSL https://bun.sh/install | bash`.

```bash
cd viewer
bun install
bun run dev        # http://localhost:5173  (predev regenerates data from ../vault)
bun run test       # parser round-trip + ingest + semantic suites (vitest)
bun run build      # production build (served at the domain root on Cloudflare Pages)
bun run typecheck  # typechecks the viewer app AND the tools/ + scripts/ TS
bun run deploy     # build + wrangler pages deploy   (run `bunx wrangler login` once first)
```

`npm install` still works for the viewer's runtime deps (React/Vite), but the
build/embeddings/ingest scripts shell out to `bun`, so Bun must be on `PATH`.

## Deploy — Cloudflare Pages

Hosted on **Cloudflare Pages** (`kip-knowledge-base.pages.dev`). Two ways to ship:

- **Local:** `cd viewer && bunx wrangler login` once, then `bun run deploy`.
- **CI:** pushing to `main` runs `.github/workflows/deploy-cf-pages.yml`
  (`bun install → test → build → wrangler pages deploy`). Add two repo secrets:
  `CLOUDFLARE_API_TOKEN` (token with the *Cloudflare Pages: Edit* permission) and
  `CLOUDFLARE_ACCOUNT_ID`. Project config lives in `viewer/wrangler.toml`.

## Ingestion

Upstream Apache Kafka sources (Confluence, Jira, GitHub, mailing list) are polled
by a GitHub Actions cron and applied back into the vault. The full contract lives
in [`docs/ingestion-spec.md`](docs/ingestion-spec.md); **M1** (Confluence
two-tier polling + deterministic `cwiki` frontmatter + drift flagging) is
implemented under [`tools/ingest/`](tools/ingest):

```bash
bun tools/ingest/run.ts --dry-run     # prints ChangeEvents + would-be frontmatter
                                       # diffs, writes nothing (hits the real cwiki
                                       # API through the polite-fetch wrapper)
bun tools/ingest/run.ts               # real run: patches the additive cwiki block,
                                       # tools/ingest-state.json, pending-changes.json
```

All network access is funneled through `tools/ingest/polite-fetch.ts` (spec §6:
≤1 req/s + jitter, concurrency ≤2, descriptive UA, robots.txt, 429/backoff,
follow-list-only). The follow list is derived from `vault/KIPs/*.md`, never
hardcoded. Deterministic metadata is machine-committed; body/prose changes are
recorded as drift in `tools/pending-changes.json` for human review — the KB
prefers **stale over wrong**. Raw payload snapshots land in the git-ignored
`tools/ingest-cache/`. The scheduled workflow is
[`.github/workflows/ingest.yml`](.github/workflows/ingest.yml) (daily 03:17 UTC).

## Corpus backfill

The full KIP corpus (~1150 pages, every status) is imported queue-style from the
cwiki index. `tools/backfill/queue.json` is the committed work queue — one entry
per KIP with a state machine (`pending → detail_done → threads_done | failed`),
checkpointed after every item, so any run resumes where the last one stopped and
git history doubles as the crawl audit log. Each import writes a **stub note**
(`stub: true` frontmatter: status, summary, cwiki link, mailing-list thread
links) alongside the 9 deep hand-authored notes; stubs are upgraded to full
structure later (M3). Statuses are normalized to
`Adopted / Early Access / Under Discussion / Discarded / Unknown` — see
`docs/ingestion-spec.md`.

```bash
bun tools/backfill/run.ts --dry-run           # discovery + would-crawl list
bun tools/backfill/run.ts --limit 50          # crawl 50, checkpoint, stop
bun tools/backfill/run.ts                     # drain all pending (~1150 × ~1s/req)
```

In CI: trigger `.github/workflows/backfill.yml` (workflow_dispatch; dry_run /
limit / no_threads inputs) — it tests first, crawls, regenerates embeddings, and
commits vault + vectors atomically. All crawling goes through the polite-fetch
wrapper (1 req/s + jitter, cwiki + lists.apache.org only). The resolver is
space-scoped with a KIP-number boundary match and prefers **skipping over
importing a wrong page**. See [`docs/sync-strategy.md`](docs/sync-strategy.md)
for the steady-state freshness design (CQL delta, twice-daily cron, monthly
reconciliation).

## Semantic layer

A build-time semantic index over the vault, under [`tools/semantic/`](tools/semantic):

- `embeddings.json` — per-KIP document vectors (`Xenova/e5-small-v2`, 384-dim,
  mean-pooled + normalized) plus a `corpusHash` staleness guard.
- `related.json` — top-3 semantic neighbors per KIP; drives the **"Similar KIPs"**
  card in the detail view's right rail (neighbors already listed in a note's
  curated `related` frontmatter are filtered out, so the two cards don't repeat).
- `golden-queries.json` / `golden-embeddings.json` — a hand-authored regression
  set: each query should retrieve an expected KIP in its top-3 (deterministic
  cosine, checked in CI with no model download).

Regenerate after editing the vault:

```bash
cd viewer && bun run embeddings   # first run downloads the ~30MB model
```

All three JSON files are committed. `viewer/test/semantic.test.ts` fails (with the
exact regen command) if the vault drifts from the committed vectors. See
[`docs/ingestion-spec.md`](docs/ingestion-spec.md) §M4 for the rubric and the
`query:`/`passage:` (e5 asymmetric) convention.

## Ask AI (deferred)

The semantic-search "Ask AI" view is scaffolded but intentionally **not wired up
yet**. When enabled it will slot in behind a single `askKips(query)` call and
expose the same `search_kips(query)` contract described in the design spec
(keyword ranking first; embeddings + LLM synthesis / an MCP server later).

## Data

Seeded with 9 representative real KIPs — KIP-500 (KRaft), KIP-405 (Tiered
Storage), KIP-98 (Exactly-Once), KIP-848 (new rebalance protocol), KIP-679
(idempotence by default), KIP-101 (leader-epoch truncation), KIP-227 (incremental
fetch), KIP-392 (fetch from closest replica), KIP-932 (Queues / share groups).
Discussion and voting entries are representative summaries written to the real
structure; replace with authoritative content on ingestion.
