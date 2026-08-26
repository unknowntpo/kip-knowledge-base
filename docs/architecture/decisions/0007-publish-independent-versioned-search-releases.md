# ADR-0007: Publish independent versioned Search releases

- Status: Accepted for Spec 005 Phase 1
- Date: 2026-08-25
- Last amended: 2026-08-26

## Context

Search operates over retained `SourceRecord` evidence, while the shared Feed is
a bounded activity view. A historical record may be searchable even when its
group is absent from the current hot Feed release. Therefore Search cannot use
the Feed index or its detail prefix as its corpus or atomic publication unit.

The public application is already served by Cloudflare Pages Functions and a
private R2 bucket under ADR-0004. Phase 1 lexical search must remain available
without Fluss, an embedding service, or an LLM in the synchronous request path.

## Decision

- Publish Search through an independent `osskb.search-release.v1` protocol.
- Write immutable release objects below
  `public/search/v1/releases/{indexRevision}/`.
- A release owns its lexical shards, release manifest, and complete
  `FeedDetail` projections for every searchable record group.
- Update `public/search/v1/current.json` last. It is the only mutable Search
  pointer and names one immutable release manifest.
- A Pages Function resolves the current pointer once per request, validates the
  release manifest, and reads shards only from that release. It never combines
  revisions.
- `/api/search` returns evidence matches plus an opaque `detailRef` containing
  the immutable index revision and publisher-generated detail object name.
- Opening that reference returns the existing `FeedDetail` contract. It does
  not create `SearchDetail` or require the group to exist in the hot Feed.
- Search and Feed releases may be published at different times. Their shared
  contract is `FeedDetail`, not release identity or membership.
- Phase 1 partitions lexical shards by project. A project filter reads only the
  named shards; an unfiltered request may read all shards in the release.
- If publication, validation, or upload fails, the current pointer remains on
  the prior complete release.

The initial object protocol is:

```text
public/search/v1/current.json
public/search/v1/releases/{indexRevision}/manifest.json
public/search/v1/releases/{indexRevision}/lexical/{projectId}.json
public/search/v1/releases/{indexRevision}/details/{detailObjectName}.json
```

The release manifest records schema, index/corpus/lexical revisions,
generation time, project shard keys, detail prefix, chunk count, group count,
and content digests. Object keys are validated as belonging to the selected
release prefix before they are read.

## Alternatives considered

### Reuse the current Feed release

Rejected. It silently restricts search to hot Feed membership and makes older
evidence impossible to open.

### Put all evidence in one browser-downloaded JSON file

Rejected as the target path. It preserves the present POC limitation: every
client downloads the complete corpus and no server boundary can enforce query
bounds. A single small fixture remains acceptable for tests.

### Query R2 objects directly as a database

Rejected. R2 owns immutable projection objects, not inverted-index execution.
Pages Functions load bounded, versioned lexical shards and perform the Phase 1
reference ranking. A measured scale failure triggers a dedicated search engine
rather than ad-hoc object scans.

### Use one manifest for Feed and Search

Rejected. It would couple two independently rebuildable projections and make a
Search failure block a valid Feed publication.

## Consequences

- Search-only groups can hydrate the same `FeedDetail` UI as Feed entries.
- Detail objects may be duplicated across Feed and Search releases. This is an
  accepted Phase 1 storage cost that keeps publication and rollback atomic.
- `detailRef` is a transport capability, not a domain identity; callers must
  treat its format as opaque.
- Search release validation and manifest-last failure assertions are required
  before the public endpoint ships.
- Pages Function memory, CPU, subrequest, shard size, latency, errors, and usage
  remain observable. Phase 1 has no invented numerical release gate; observed
  pressure triggers a new decision. The protocol permits later shard splitting
  without changing the domain model.

## Revisit when

- measured shard reads exceed Pages Function latency, CPU, memory, or
  subrequest budgets;
- several frontends require an independently deployed Search API;
- detail duplication becomes material enough to justify content-addressed
  shared detail objects;
- an external lexical/ANN engine can preserve immutable index revisions,
  evidence citations, rollback, and provider replacement more simply.
