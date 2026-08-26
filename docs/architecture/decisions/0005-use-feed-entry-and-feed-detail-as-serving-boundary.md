# ADR-0005: Use FeedEntry and FeedDetail as the serving boundary

- Status: Accepted
- Date: 2026-08-25

## Context

Earlier experiments introduced `TopicPage`, `DecisionStory`, `FeedStory`, and
`FeedTopic` as overlapping representations of a browsable discussion cluster.
The accepted product interaction is now simpler: the feed renders one compact
entry, and opening it loads one detail containing the complete source-backed
timeline and optional cited key points.

Keeping several public names for the same lifecycle would duplicate titles,
record membership, summaries, and activity state. It would also force the new
event materializer to preserve POC compatibility fields rather than target one
precise contract.

## Decision

- `FeedEntry` is the compact, rankable object shown in the feed.
- `FeedDetail` is the complete read model opened from one `FeedEntry`.
- `FeedDetail.records` is the only record-membership source of truth for the
  opened detail; Timeline is derived from those records.
- `FeedRecordGroup` remains an internal, discardable materializer result that
  decides which source records belong together. It is not serialized to R2 or
  exposed through the web API.
- Remove `TopicPage`, `DecisionStory`, and `FeedStory` from the executable v1
  contract. A future decision-specific product may add a new versioned derived
  view only when it has behavior not already owned by `FeedDetail`.
- The serving projection uses explicit Feed index entries and separately stored
  FeedDetail objects. It does not carry an `items` compatibility copy.
- The web app and publisher depend on one shared serving contract rather than
  defining looser local copies.

This ADR amends the constitution's list of core concepts. The canonical core
remains Project, Contributor, Artifact, Thread, Message, Event, and
Relationship; Feed read models are discardable projections.

## Alternatives considered

- Keep all names as aliases: rejected because aliases would preserve duplicated
  ownership and make schema evolution ambiguous.
- Keep `TopicPage` as the API object and map it to Feed types in the UI:
  rejected because it adds translation without a distinct invariant.
- Make `FeedRecordGroup` public: rejected because grouping may be recomputed,
  split, or replaced without changing the user-facing entry/detail contract.
- Keep `DecisionStory` for possible future use: deferred; speculative public
  interfaces should not constrain v1.

## Consequences

- Existing POC object names and API fields require a controlled serving-schema
  cleanup before the replayable materializer is implemented.
- Feed membership, title, summary, and activity have one owner.
- Future Flink output has one public result to compare against the TypeScript
  oracle.
- A future decision-specific view will require its own spec, version, and
  evidence-backed distinction from FeedDetail.

## Migration

1. Move the grouping algorithm out of the `feed-story` compatibility module.
2. Remove obsolete TopicPage and DecisionStory types, validation, and fixtures.
3. Replace `FeedTopic` and `items` with the shared serving Feed index contract.
4. Keep R2 manifest-last publication and lazy detail hydration unchanged.
5. Run domain, projection, type, build, and browser assertions before publishing
   a new serving projection.

## Revisit when

- one feed entry must open several independently versioned details;
- a decision-specific aggregate gains behavior not representable by FeedDetail;
- multiple API consumers require a separately versioned transport DTO.
