# Spec 002 Acceptance Scenarios

All fixtures use fixed IDs and timestamps. Each assertion names its input,
action, observable result, and repeatable evidence.

## F1. Singleton fallback without AI

**Given** one root source record and its source-native child comment  
**And** no clustering or key-point model is configured  
**When** feed record groups are projected and the detail is built  
**Then** one group contains the root and child  
**And** key points are explicitly unavailable rather than fabricated.

## F2. Exact cross-source grouping

**Given** a proposal, discussion, and pull request connected by accepted
`discusses` and `implements` relationships  
**When** feed record groups are projected  
**Then** their roots form one group with all source-native descendants  
**And** relationship IDs remain visible as grouping provenance.

## F3. A reference is not automatically the same group

**Given** two root records connected only by `references`  
**When** feed record groups are projected  
**Then** they remain separate groups.

## F4. Model clustering is feed-only

**Given** two separate roots and an accepted model cluster suggestion  
**When** feed record groups are projected  
**Then** one group contains both roots and retains model provenance  
**And** no accepted domain relationship is created or mutated.

## F5. Invalid model clustering is rejected

**Given** a below-threshold or cross-project suggestion  
**When** feed record groups are projected  
**Then** roots remain separate and project isolation is preserved.

## F6. Valid key points retain provenance

**Given** a key-point generator returns a claim citing contained records  
**When** `FeedDetail` is built  
**Then** the claim retains its evidence IDs and derivation revision.

## F7. Invalid citations degrade safely

**Given** a key point cites a record outside the detail  
**When** the generated result is validated  
**Then** it is rejected as an invalid citation  
**And** FeedEntry, records, activity, and links remain available.

## F8. Generator failure does not remove the detail

**Given** the key-point generator is unavailable  
**When** `FeedDetail` is loaded  
**Then** key points expose failure or unavailability explicitly  
**And** the deterministic timeline remains available.

## F9. Duplicate and out-of-order inputs replay identically

**Given** duplicate records and events delivered in different orders  
**When** both sets use the same revisions and activity window  
**Then** canonical grouping output is logically identical  
**And** duplicate activity is counted once.

## F10. Hot ordering is deterministic

**Given** two groups with different unique in-window activity counts  
**When** FeedEntries are ranked  
**Then** the higher score appears first  
**And** ties use stable group ID ordering.

## F11. Project isolation

**Given** records and relationships from two projects  
**When** feed record groups are projected  
**Then** no group contains records from more than one project.

## Community case matrix

- **C1 — Kafka multi-source:** KIP, mailing-list discussion, and implementation
  pull request form one group through exact relationships.
- **C2 — DataFusion GitHub-only:** issue, pull request, and review form one
  group without Jira, Wiki, or mailing-list requirements.
- **C3 — Flink transitive:** FLIP, Jira work, discussion, and pull request
  converge through exact relationship edges.
- **C4 — Spark Jira + GitHub:** Jira issue and fixing pull request group without
  requiring a proposal page.
- **C5 — Mailing-list-only:** root email and replies use source-native hierarchy.
- **C6 — Slack-only:** source text provides a deterministic title when the
  platform has no native title.
- **C7 — Slack + GitHub:** an exact `discusses` edge groups the two roots while
  preserving both links.
- **C8 — Mixed feed:** Kafka, DataFusion, Flink, and Spark remain isolated by
  project and rank together using deterministic activity.
