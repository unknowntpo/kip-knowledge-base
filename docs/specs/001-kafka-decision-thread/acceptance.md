# Spec 001 Acceptance Scenarios

These scenarios are the executable intent for the first vertical slice. Test
fixtures must use fixed timestamps and IDs.

## A1. Cross-source thread

**Given** a KIP page, linked Jira issue, mailing-list discussion and vote, and
linked GitHub pull request
**When** their normalized events are materialized
**Then** one Decision Thread contains entries from every available source
**And** every entry exposes its canonical URL and source timestamp.

## A2. Duplicate delivery

**Given** the same event is delivered more than once
**When** the materializer processes all deliveries
**Then** the event and its timeline entry appear exactly once.

## A3. Out-of-order delivery

**Given** a later message arrives before an earlier message
**When** both have been processed
**Then** the timeline is ordered by source time and stable event-ID tie-breaker
regardless of arrival order.

## A4. Deterministic replay

**Given** a fixed event set, schema version, and materializer version
**When** state is discarded and the event set is replayed twice
**Then** both current views are logically identical
**And** any serialized golden representation is byte-identical after canonical
sorting.

## A5. Missing source

**Given** Jira is unavailable while other sources are available
**When** the KIP is refreshed
**Then** existing evidence remains browsable
**And** Jira is marked stale or unavailable
**And** the system does not invent Jira content or delete the last known value.

## A6. Explicit versus inferred links

**Given** one pull request explicitly names `KIP-500` and another is only
semantically similar
**When** linking runs
**Then** the explicit pull request enters the accepted graph
**And** the similar pull request remains a provenance-bearing suggestion until
reviewed.

## A7. Contributor identity safety

**Given** the same display name appears in GitHub and the mailing list without
authoritative matching evidence
**When** identities are resolved
**Then** they remain separate SourceIdentity records
**And** the UI does not claim they are the same contributor.

## A8. LLM-disabled operation

**Given** no model credentials or LLM service are available
**When** a user opens a Decision Thread
**Then** all deterministic entries, relationships, and source links render
**And** the generated overview is clearly unavailable without breaking the
page.

## A9. Cited generated claims

**Given** an overview is generated
**When** it claims that an alternative was rejected or a vote passed
**Then** the claim contains one or more supporting entity/message IDs
**And** those IDs resolve to evidence included in the recorded input set
**And** model and prompt versions are visible in generation metadata.

## A10. Project-neutral core

**Given** a fixture uses a second project ID, project-scoped source instances,
and project-specific artifact and status mappings
**When** its already-normalized events are materialized
**Then** the core timeline code processes them without Kafka-specific branches
**And** only source and status facets declared by that project's profile are
exposed.

## A11. Visual continuity without legacy coupling

**Given** a representative Decision Thread rendered at agreed desktop and
mobile breakpoints
**When** it is reviewed beside the legacy viewer reference screens
**Then** it retains the recognizable typography, palette, spacing rhythm, and
content-first character
**And** the page does not depend on legacy `Kip`, vault parser, generated JSON,
or route contracts.

## A12. GitHub-only project status

**Given** a project profile declares one GitHub source instance, no Jira,
mailing-list, or proposal-wiki source, and selects
`github-pull-request-status@1`
**And** a pull request has a merge event
**When** its topic and filter facets are materialized
**Then** the topic has the project-owned `merged` status with the merge event as
evidence
**And** the UI exposes only the GitHub source and that profile's statuses
**And** switching from another project clears source and status selections that
are not valid in the GitHub-only profile.

## Release gate

Spec 001 is complete only when A1-A12 are automated or have a documented,
repeatable verification command with captured evidence. A11 may use captured
reference screenshots plus browser checks. A demo without replay, LLM-off, and
provenance checks does not satisfy the spec.
