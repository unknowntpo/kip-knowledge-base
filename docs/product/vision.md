# Product Vision

## Intent

Turn discussions across open-source communities into a browsable,
evidence-backed knowledge network. A user should be able to follow a technical
decision across proposal pages, issue trackers, mailing lists, and code review
without already knowing where each community stores its history.

## Initial audience

- contributors learning why a design changed;
- maintainers reconstructing prior decisions;
- engineers preparing for data-platform and distributed-systems interviews;
- researchers exploring contributor, topic, and decision flows.

## Product shape

The product is a continuously updated community knowledge base with two primary
entry points: cross-source search and a shared, non-personalized activity feed.
The feed presents latest or globally active discussion topics from public
community events; it does not require user tracking or preference data.

Each feed and search item preserves the original author, time, source, and link.
Opening a FeedEntry loads a FeedDetail that organizes those records into a
timeline without hiding the underlying evidence.

Kafka is the first community profile and validation corpus. Flink and Spark are
the next expected communities; the product and domain model are not
Kafka-specific.

Each project profile declares its own source instances, artifact types, and
status policy. Jira, a proposal wiki, and a mailing list are optional. A
GitHub-only project may derive its visible status from pull-request state and
merge events without introducing GitHub-specific branches into the core.

Product interfaces follow the self-explanatory and localization rules in
[Interface Principles](interface-principles.md).

## Success signals

The first release succeeds when a user can enter a KIP identifier and:

1. see linked KIP, Jira, discussion, vote, and GitHub activity in one timeline;
2. verify every item and generated claim against its source;
3. reproduce the same deterministic timeline by replaying its events;
4. browse the timeline even when all LLM functionality is disabled.

Personalized recommendations, contributor ranking, and cross-project discovery
are later capabilities. They must be built from the same evidence-backed core.
