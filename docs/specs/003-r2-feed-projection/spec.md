# Spec 003: Versioned R2 Feed Projection

Status: POC deployed

## Intent

Serve the Vue Feed and FeedDetail from a private R2 bucket through same-origin
Cloudflare Pages Functions, without placing ingestion or stream-processing
systems in the browser request path.

## Scope

- Vue 3, Vite, TypeScript, and Vue Router preserve the accepted Feed → Detail
  interaction and existing visual language.
- A deterministic publisher converts one `FeedPublication` into an immutable
  `FeedIndex`, one object per `FeedDetail`, and a current manifest.
- Pages Functions hydrate Feed and Detail through an R2 binding.
- Local Wrangler/Miniflare and an isolated Cloudflare deployment prove the same
  Pages Functions → private R2 boundary.

## Non-goals

- Deploying or provisioning a production Pages project or R2 bucket.
- Replacing Fluss/Flink as the target event and processing plane.
- Implementing semantic search, authentication, or personalized ranking.
- Making R2 the owner of connector checkpoints or canonical events.

## Public object contract

```text
public/v2/current.json
public/v2/releases/{releaseId}/feed/index.json
public/v2/releases/{releaseId}/details/{safeFeedEntryId}.json
```

The publisher writes the manifest last. Release objects are immutable. Feed
index records contain only the data needed to render and filter cards; complete
records, connections, and key points live in FeedDetail.

The publisher rejects missing or orphaned details before producing any object.
The manifest is the final object in the generated publication sequence.
