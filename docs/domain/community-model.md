# Community Domain Model

Status: Target domain contract for new work

This model keeps the core independent of Kafka. Reusable source connectors
preserve system-specific detail, while community profiles interpret each
project's naming and linking conventions.

## Identity rules

- Every identifier is namespaced: `apache-kafka:kip:500`,
  `apache-kafka:jira:KAFKA-9119`, or `github:apache/kafka:pr:10251`.
- Upstream identifiers are preserved; internal IDs do not replace canonical
  URLs or source keys.
- A contributor may have several source identities. Identity resolution is an
  explicit, provenance-bearing relationship, never an unrecorded merge.
- Events are immutable. Corrections arrive as new events or new derivations.

## Entities

### Project

An open-source community such as Apache Kafka, Apache Flink, or Apache Spark.
It selects source connector configuration and project-specific profile rules.

Required fields: `id`, `name`, `canonicalUrl`, `profileVersion`.

### CommunityProfile

`CommunityProfile` is the versioned configuration and deterministic policy for
one project. It declares which source instances exist, which artifact types the
project recognizes, and which statuses the product may expose for that project.
The core never assumes that Jira, Confluence, or a mailing list exists.

Required fields: `projectId`, `version`, `sourceInstances`,
`artifactTypeDefinitions`, and `statusDefinitions`.

Each `ArtifactTypeDefinition` selects its own versioned deterministic status
policy. This allows one project to apply different policies to proposals,
issues, and pull requests. Profile configuration selects typed policy code; it
does not contain arbitrary executable expressions. Two valid examples are:

- `apache-kafka-proposal-status@1`, which derives a proposal status from the
  observed KIP state;
- `github-pull-request-status@1`, which derives `open`, `merged`, or
  `closed-without-merge` from GitHub pull-request events for a project that has
  no proposal wiki, Jira, or mailing list.

Changing profile rules creates a new profile or policy version. Existing
derived status records retain the version that produced them.

### SourceInstance

A `SourceInstance` is one project-scoped upstream location. A project may have
zero, one, or many instances of the same source type.

Required fields: `id`, `projectId`, `sourceType`, `displayName`, `canonicalUrl`,
`connectorRef`, `capabilities`.

`sourceType` is a reusable connector category such as `wiki`, `issue-tracker`,
`mailing-list`, `code-host`, `forum`, or `chat`. `id` identifies the concrete
instance, for example `apache-kafka:mailing-list:dev` or
`github:example/project`. Capabilities such as `issues`, `pull-requests`,
`reviews`, `comments`, and `webhooks` describe observed behavior without making
the source mandatory for another project.

### ArtifactTypeDefinition and project status

An `ArtifactTypeDefinition` gives a project-specific artifact its display name,
identifier rules, allowed native states, and applicable status policy. KIP,
FLIP, and a GitHub-only pull request can therefore remain different concepts.

Required `ArtifactTypeDefinition` fields: `key`, `displayName`,
`sourceInstanceIds`, `identifierRules`, `nativeStateDefinitions`,
and an optional typed `statusPolicy` configuration.

Each `statusDefinition` has a project-namespaced `key`, localized label,
terminal flag, and applicable artifact types. The profile may also provide a
facet label such as `KIP status`, `FLIP status`, or `Pull request status`.

The system keeps three different values rather than forcing one global enum:

- `nativeState`: the exact state observed upstream;
- `projectStatus`: a project-owned, namespaced status produced by the selected
  policy, with `policyRef`, `profileVersion`, and `evidenceEventIds`;
- `activityState`: an optional cross-project derived value such as `active`,
  `quiet`, or `closed`, used only for global activity views.

`projectStatus` is not required for every topic. A discussion with no proposal
or governing artifact may expose only its activity state.

### Contributor and SourceIdentity

`Contributor` is a resolved community participant. `SourceIdentity` is the
observable identity from one system, such as a mailing-list address, Jira user,
or GitHub login.

An identity-resolution edge includes `method`, `confidence`, `evidence`, and
`reviewStatus`. Low-confidence identities remain separate.

### Artifact

A durable work or proposal object. Examples include KIP, FLIP, SPIP, Jira
issue, GitHub issue, pull request, release, and commit.

Required fields: `id`, `projectId`, `sourceInstanceId`, `artifactType`,
`externalKey`, `title`, `canonicalUrl`, `nativeState`, `createdAt`, `updatedAt`.

Optional derived fields: `projectStatus`, `activityState`.

### Thread

A source-native conversation attached to zero or more artifacts. Examples are
mailing-list discussion and vote threads, Jira comments, GitHub issue comments,
and pull-request review threads.

Required fields: `id`, `projectId`, `sourceInstanceId`, `threadType`,
`canonicalUrl`.

### Message

One authored entry in a thread. Edits are represented through source versions
or later events so the observed history is not destroyed.

Required fields: `id`, `threadId`, `sourceIdentityId`, `sourceTimestamp`,
`canonicalUrl`, `contentRef`, `sourceVersion`.

### Event

The append-only observation envelope used for ingestion and replay:

```jsonc
{
  "id": "sha256:...",
  "projectId": "apache-kafka",
  "sourceType": "wiki | issue-tracker | code-host | mailing-list | forum | chat",
  "sourceInstanceId": "apache-kafka:mailing-list:dev",
  "entityType": "artifact | thread | message | contributor",
  "entityId": "apache-kafka:kip:500",
  "eventType": "observed | created | updated | state-changed | linked",
  "sourceCursor": "source-specific-version-or-watermark",
  "sourceTimestamp": "2026-08-17T00:00:00Z",
  "observedAt": "2026-08-17T00:01:00Z",
  "canonicalUrl": "https://...",
  "payloadRef": "content-addressed://sha256/...",
  "schemaVersion": 1,
  "sourceConnectorVersion": "confluence@1",
  "communityProfileVersion": "apache-kafka@1"
}
```

The deterministic dedupe identity is `(projectId, sourceInstanceId, entityId,
sourceCursor)`. `observedAt` is audit metadata and does not affect the dedupe
identity. `sourceType` selects reusable behavior; `sourceInstanceId` prevents
two repositories, mailing lists, or trackers in the same project from
colliding.

### Relationship

A directed edge between entities. It records `type`, `method`, `evidence`,
`confidence`, and `reviewStatus`.

Methods are:

- `explicit`: an upstream identifier or authoritative link;
- `deterministic`: a versioned rule such as a boundary-safe key parser;
- `inferred`: a model suggestion requiring provenance and review policy;
- `curated`: a human-reviewed relationship.

### Feed read models

An `Artifact.title` is copied from its upstream source. It belongs to a concrete
project and source instance; project configuration does not impose one global
title convention. For example, `KIP-1150` and GitHub pull request `#204` retain
their own source keys and titles.

`FeedRecordGroup` is an internal, discardable materializer result. It groups one
or more source records through source-native parentage, accepted deterministic
relationships, or explicitly validated model suggestions. It is never a public
API or storage contract.

`FeedEntry` is the compact, rankable read model rendered in the activity feed.
It owns the source-backed title, summary, explicit reason for appearing,
activity evidence, and the IDs of records that will be available in its detail.

`FeedDetail` is loaded after a user opens one `FeedEntry`. It contains exactly
the entry's source records, their accepted connections, and optional cited key
points. The visible timeline is derived deterministically from
`FeedDetail.records`; it is not a second stored membership list. Every record
retains its canonical Slack, GitHub, Jira, mailing-list, or other source URL.

The feed orders entries using a deterministic, versioned activity score over
normalized signals such as recent messages, distinct participants, state
changes, reactions when available, and active source count. Missing source
capabilities contribute no signal. An LLM may suggest grouping or generate a
cited summary, but it does not decide the deterministic activity score. If the
LLM is unavailable, singleton groups, source-backed titles, links, and timelines
remain usable.

Any displayed project status contains its namespaced status key, policy and
profile versions, and evidence event IDs. It is a discardable derived value;
replaying the same events with the same policy version must reproduce it.

## Processing ownership

| Responsibility | Owner |
|---|---|
| Raw event retention and current keyed state | Fluss |
| Stateful dedupe, ordering, linking, materialized views | Flink |
| Open historical tables and replay/export boundary | Iceberg |
| Offline clustering, embeddings, recommendation candidates | Spark |
| Semantic summaries and inferred-link suggestions | LLM service |
| Human-facing FeedEntry and FeedDetail browsing | Web/API |

The ownership table describes the target architecture. The legacy vault model
is not a compatibility boundary for these entities.

## Executable contract

The authoritative executable v1 shape is exported by
`packages/domain/src/v1/index.ts`. It contains TypeScript interfaces,
discriminated event and status-policy unions, runtime profile invariants, and an
event parser for untrusted JSON boundaries. This document owns intent and
semantics; changes to either representation must update the other in the same
change.
