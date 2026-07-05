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
  scripts/parse-vault.mjs   vault markdown -> structured KIP model
  scripts/build-kips.mjs    writes src/data/kips.generated.json (pre dev/build)
  src/                      TopBar, Browse, Detail, Ask views (routes /, /kip/:id, /ask)
  test/parse.test.ts        round-trips the vault losslessly against the seed
tools/kips.seed.json    canonical import snapshot (provenance + parser fixture)
.github/workflows/      GitHub Pages deploy for the viewer
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

```bash
cd viewer
npm install
npm run dev        # http://localhost:5173  (predev regenerates data from ../vault)
npm test           # parser round-trip
npm run build      # production build (base /kip-knowledge-base/ for Pages)
```

## Deploy

Pushing to `main` builds the viewer and publishes it to GitHub Pages
(`.github/workflows/deploy-pages.yml`). Enable Pages → *Source: GitHub Actions*.

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
