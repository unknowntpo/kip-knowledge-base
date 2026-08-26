export type FeedRecordId = string;
export type FeedProjectId = string;

export interface FeedSourceRecord {
  readonly id: FeedRecordId;
  readonly projectId: FeedProjectId;
  readonly sourceId: string;
  readonly parentRecordId?: FeedRecordId;
  readonly title?: string;
  readonly textPreview?: string;
  readonly canonicalUrl: string;
  readonly sourceVersion: string;
}

export type FeedGroupingRelationshipKind =
  | "discusses"
  | "implements"
  | "fixes"
  | "duplicates"
  | "references"
  | "related-to";

export interface FeedRecordRelationship {
  readonly id: string;
  readonly projectId: FeedProjectId;
  readonly fromRecordId: FeedRecordId;
  readonly toRecordId: FeedRecordId;
  readonly kind: FeedGroupingRelationshipKind;
  readonly provenance:
    | { readonly kind: "source-link"; readonly sourceVersion: string }
    | { readonly kind: "deterministic-rule"; readonly ruleRevision: string }
    | { readonly kind: "curated"; readonly curatorId: string }
    | {
        readonly kind: "model-inference";
        readonly modelRevision: string;
        readonly confidence: number;
        readonly reviewStatus: "unreviewed" | "approved" | "rejected";
      };
}

export interface FeedActivityEvent {
  readonly id: string;
  readonly projectId: FeedProjectId;
  readonly recordId: FeedRecordId;
  readonly occurredAt: string;
}

export interface FeedModelClusterSuggestion {
  readonly id: string;
  readonly projectId: FeedProjectId;
  readonly rootRecordIds: readonly [FeedRecordId, ...FeedRecordId[]];
  readonly evidenceRecordIds: readonly FeedRecordId[];
  readonly modelRevision: string;
  readonly confidence: number;
}

/**
 * Internal grouping output. It is not a feed card and owns no presentation
 * summary or recommendation reason.
 */
export interface FeedRecordGroup {
  readonly id: string;
  readonly projectId: FeedProjectId;
  readonly rootRecordIds: readonly FeedRecordId[];
  readonly recordIds: readonly FeedRecordId[];
  readonly title: {
    readonly kind: "source";
    readonly text: string;
    readonly sourceRecordId: FeedRecordId;
  };
  readonly sourceReferences: readonly {
    readonly recordId: FeedRecordId;
    readonly canonicalUrl: string;
  }[];
  readonly grouping: {
    readonly relationshipIds: readonly string[];
    readonly modelSuggestions: readonly {
      readonly id: string;
      readonly modelRevision: string;
      readonly confidence: number;
      readonly evidenceRecordIds: readonly FeedRecordId[];
    }[];
    readonly clusteringRevision: string;
  };
  readonly activity: {
    readonly score: number;
    readonly evidenceEventIds: readonly string[];
  };
}

/** Key-point generation belongs to FeedDetail, not record grouping. */
export interface FeedGroupingInput {
  readonly records: readonly FeedSourceRecord[];
  readonly relationships: readonly FeedRecordRelationship[];
  readonly activityEvents: readonly FeedActivityEvent[];
  readonly modelSuggestions?: readonly FeedModelClusterSuggestion[];
  readonly minimumModelConfidence: number;
  readonly window: {
    readonly startedAt: string;
    readonly endedAt: string;
  };
  readonly clusteringRevision: string;
}

export type FeedRecordGrouper = (
  input: FeedGroupingInput,
) => readonly FeedRecordGroup[];

const groupingKinds = new Set(["discusses", "implements", "fixes", "duplicates"]);

function isTrustedGroupingRelationship(
  relationship: FeedRecordRelationship,
): boolean {
  if (!groupingKinds.has(relationship.kind)) return false;
  if (relationship.provenance.kind !== "model-inference") return true;
  return relationship.provenance.reviewStatus === "approved";
}

function uniqueById<T extends { readonly id: string }>(values: readonly T[]): T[] {
  const result = new Map<string, T>();
  for (const value of values) {
    if (!result.has(value.id)) result.set(value.id, value);
  }
  return [...result.values()];
}

class DisjointSet {
  private readonly parent = new Map<string, string>();

  add(value: string): void {
    if (!this.parent.has(value)) this.parent.set(value, value);
  }

  find(value: string): string {
    const parent = this.parent.get(value);
    if (parent === undefined) throw new Error(`Unknown set member: ${value}`);
    if (parent === value) return value;
    const root = this.find(parent);
    this.parent.set(value, root);
    return root;
  }

  union(left: string, right: string): void {
    const leftRoot = this.find(left);
    const rightRoot = this.find(right);
    if (leftRoot === rightRoot) return;
    const [first, second] = [leftRoot, rightRoot].sort();
    this.parent.set(second, first);
  }
}

function resolveRoot(
  record: FeedSourceRecord,
  recordsById: ReadonlyMap<FeedRecordId, FeedSourceRecord>,
): FeedSourceRecord {
  const visited = new Set<FeedRecordId>();
  let current = record;
  while (current.parentRecordId !== undefined) {
    if (visited.has(current.id)) throw new Error(`Parent cycle at ${current.id}`);
    visited.add(current.id);
    const parent = recordsById.get(current.parentRecordId);
    if (parent === undefined) throw new Error(`Missing parent ${current.parentRecordId}`);
    if (parent.projectId !== current.projectId || parent.sourceId !== current.sourceId) {
      throw new Error(`Invalid cross-source parent for ${current.id}`);
    }
    current = parent;
  }
  return current;
}

/**
 * Groups source records without creating a public FeedEntry or FeedDetail.
 * Group identity is discardable; record membership and provenance are the
 * observable behavior protected by the acceptance contract.
 */
export const groupFeedRecords: FeedRecordGrouper = (input) => {
  const records = uniqueById(input.records);
  const recordsById = new Map(records.map((record) => [record.id, record]));
  const rootByRecordId = new Map<FeedRecordId, FeedSourceRecord>();
  for (const record of records) rootByRecordId.set(record.id, resolveRoot(record, recordsById));

  const roots = records.filter((record) => record.parentRecordId === undefined);
  const sets = new DisjointSet();
  for (const root of roots) sets.add(root.id);

  for (const relationship of uniqueById(input.relationships)) {
    const from = recordsById.get(relationship.fromRecordId);
    const to = recordsById.get(relationship.toRecordId);
    if (from === undefined || to === undefined) continue;
    if (
      relationship.projectId !== from.projectId ||
      from.projectId !== to.projectId ||
      !isTrustedGroupingRelationship(relationship)
    ) continue;
    const fromRoot = rootByRecordId.get(from.id);
    const toRoot = rootByRecordId.get(to.id);
    if (fromRoot !== undefined && toRoot !== undefined) sets.union(fromRoot.id, toRoot.id);
  }

  const acceptedSuggestionIds = new Map<string, string[]>();
  for (const suggestion of uniqueById(input.modelSuggestions ?? [])) {
    if (suggestion.confidence < input.minimumModelConfidence) continue;
    const suggestionRoots = suggestion.rootRecordIds
      .map((recordId) => recordsById.get(recordId))
      .filter((record): record is FeedSourceRecord => record !== undefined);
    if (suggestionRoots.length !== suggestion.rootRecordIds.length) continue;
    if (
      suggestionRoots.some(
        (record) => record.parentRecordId !== undefined || record.projectId !== suggestion.projectId,
      )
    ) continue;
    if (
      suggestion.evidenceRecordIds.some(
        (recordId) => recordsById.get(recordId)?.projectId !== suggestion.projectId,
      )
    ) continue;
    const [first, ...rest] = suggestionRoots;
    if (first === undefined) continue;
    for (const root of rest) sets.union(first.id, root.id);
    const key = suggestionRoots.map((root) => root.id).sort().join("|");
    acceptedSuggestionIds.set(key, [...(acceptedSuggestionIds.get(key) ?? []), suggestion.id]);
  }

  const components = new Map<string, FeedSourceRecord[]>();
  for (const root of roots) {
    const componentId = sets.find(root.id);
    components.set(componentId, [...(components.get(componentId) ?? []), root]);
  }

  const events = uniqueById(input.activityEvents).filter(
    (event) => event.occurredAt >= input.window.startedAt && event.occurredAt < input.window.endedAt,
  );
  const groups: FeedRecordGroup[] = [];

  for (const componentRoots of components.values()) {
    const sortedRoots = [...componentRoots].sort((left, right) => left.id.localeCompare(right.id));
    const rootIds = new Set(sortedRoots.map((root) => root.id));
    const groupRecords = records
      .filter((record) => {
        const root = rootByRecordId.get(record.id);
        return root !== undefined && rootIds.has(root.id);
      })
      .sort((left, right) => left.id.localeCompare(right.id));
    const projectIds = new Set(groupRecords.map((record) => record.projectId));
    if (projectIds.size !== 1) throw new Error("A feed record group crossed project scope");

    const groupRecordIds = new Set(groupRecords.map((record) => record.id));
    const groupEvents = events
      .filter((event) => groupRecordIds.has(event.recordId))
      .sort((left, right) => left.id.localeCompare(right.id));
    const displayRoot =
      sortedRoots.find((root) => root.title !== undefined) ??
      sortedRoots.find((root) => root.textPreview !== undefined);
    const sourceBackedTitle = displayRoot?.title ?? displayRoot?.textPreview;
    if (displayRoot === undefined || sourceBackedTitle === undefined) {
      throw new Error("A feed record group requires a source title or text preview");
    }

    const relatedRootIds = new Set(sortedRoots.map((root) => root.id));
    const relationshipIds = uniqueById(input.relationships)
      .filter((relationship) => {
        const fromRoot = rootByRecordId.get(relationship.fromRecordId);
        const toRoot = rootByRecordId.get(relationship.toRecordId);
        return (
          fromRoot !== undefined &&
          toRoot !== undefined &&
          relatedRootIds.has(fromRoot.id) &&
          relatedRootIds.has(toRoot.id) &&
          isTrustedGroupingRelationship(relationship) &&
          relationship.projectId === displayRoot.projectId
        );
      })
      .map((relationship) => relationship.id)
      .sort();
    const modelSuggestions = uniqueById(input.modelSuggestions ?? [])
      .filter((suggestion) => {
        const key = [...suggestion.rootRecordIds].sort().join("|");
        return (
          acceptedSuggestionIds.has(key) &&
          suggestion.rootRecordIds.every((recordId) => relatedRootIds.has(recordId))
        );
      })
      .map((suggestion) => ({
        id: suggestion.id,
        modelRevision: suggestion.modelRevision,
        confidence: suggestion.confidence,
        evidenceRecordIds: [...suggestion.evidenceRecordIds].sort(),
      }))
      .sort((left, right) => left.id.localeCompare(right.id));

    groups.push({
      id: `feed-record-group:${sortedRoots.map((root) => root.id).join("+")}`,
      projectId: displayRoot.projectId,
      rootRecordIds: sortedRoots.map((root) => root.id),
      recordIds: groupRecords.map((record) => record.id),
      title: { kind: "source", text: sourceBackedTitle, sourceRecordId: displayRoot.id },
      sourceReferences: groupRecords.map((record) => ({
        recordId: record.id,
        canonicalUrl: record.canonicalUrl,
      })),
      grouping: {
        relationshipIds,
        modelSuggestions,
        clusteringRevision: input.clusteringRevision,
      },
      activity: {
        score: groupEvents.length,
        evidenceEventIds: groupEvents.map((event) => event.id),
      },
    });
  }

  return groups.sort(
    (left, right) => right.activity.score - left.activity.score || left.id.localeCompare(right.id),
  );
};
