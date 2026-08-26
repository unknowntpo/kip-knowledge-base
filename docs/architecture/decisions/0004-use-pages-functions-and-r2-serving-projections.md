# ADR 0004: Use Cloudflare Pages Functions and R2 for public serving projections

Status: Accepted for POC

Date: 2026-08-21

## Context

The public Feed and FeedDetail views are read-heavy, cacheable, and must remain
available when the ingestion or stream-processing path is offline. The frontend
will be deployed on Cloudflare Pages. Exposing Fluss, Flink, or Iceberg in the
browser request path would couple public availability and credentials to the
processing plane.

## Decision

- Cloudflare Pages serves the Vue static application.
- Same-project Pages Functions expose `/api/feed` and `/api/detail/:id`.
- Pages Functions read a private R2 bucket through an `OSS_KB_BUCKET` binding.
- R2 contains only bounded, public-safe read models; it does not own connector
  checkpoints, event-time state, canonical source evidence, or search ranking.
- A release is published to immutable `public/v2/releases/{releaseId}/*`
  objects. `public/v2/current.json` is updated last and is the only mutable
  pointer.
- Feed index objects exclude hydrated `FeedDetail`; the detail object is loaded
  only after a user opens an entry.

## Alternatives

### Browser reads a public R2 bucket directly

Rejected for the POC. It requires a public bucket and CORS, exposes storage keys,
and removes the boundary where schema validation, cache policy, future auth, and
semantic-search routing can live.

### Separate Cloudflare Worker deployment

Deferred. Pages Functions already provide the Worker runtime and R2 binding on
the same origin. Revisit when multiple clients need the API or its deployment
lifecycle must differ from the frontend.

### Public API queries Fluss or Iceberg synchronously

Rejected. It makes the processing/history planes part of public availability
and exposes broader credentials than the read path needs.

## Consequences

- Feed and Detail remain readable from the last successful release.
- Publication needs release validation and a manifest-last protocol.
- Search that cannot be satisfied by a bounded static index requires a separate
  function-backed search service; R2 is not a query engine.
- R2 object-name encoding is part of the serving protocol and must remain stable
  across publishers, Wrangler, and Pages Functions.

## Revisit conditions

- Pages Function limits fail a measured latency or throughput assertion.
- Authenticated/private views require a separate API lifecycle.
- Multiple frontends need an independently versioned serving API.
- Feed projection size makes one index object exceed the agreed bounded-read
  budget and requires pagination or sharding.

## Amendment

ADR 0005 replaced the experimental `FeedPayload`/`FeedTopic` shape with the
shared `FeedIndex` and `FeedDetail` serving boundary. The manifest-last decision
is unchanged; its executable schema is now `osskb.feed-manifest.v2`.
