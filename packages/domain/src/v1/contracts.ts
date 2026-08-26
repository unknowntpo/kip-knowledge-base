/**
 * Version 1 domain contracts.
 *
 * These types describe normalized data after a source connector has translated
 * upstream payloads. JSON entering the system must pass the runtime boundary in
 * validation.ts before it is treated as one of these types.
 */

export type ProjectId = string;
export type SourceInstanceId = string;
export type ArtifactId = string;
export type ArtifactTypeKey = string;
export type ThreadId = string;
export type MessageId = string;
export type ContributorId = string;
export type SourceIdentityId = string;
export type EventId = string;
export type ProjectStatusKey = string;
export type ProfileVersion = string;
export type IsoTimestamp = string;

export type LocalizedText = Readonly<Record<string, string>>;

export type SourceType =
  | "wiki"
  | "issue-tracker"
  | "code-host"
  | "mailing-list"
  | "forum"
  | "chat"
  | "other";

export type SourceCapability =
  | "artifacts"
  | "issues"
  | "pull-requests"
  | "reviews"
  | "comments"
  | "threads"
  | "votes"
  | "webhooks"
  | "delta-polling";

export interface ProjectV1 {
  readonly schemaVersion: 1;
  readonly id: ProjectId;
  readonly name: string;
  readonly canonicalUrl: string;
  readonly activeProfileVersion: ProfileVersion;
}

export interface SourceInstanceV1 {
  readonly id: SourceInstanceId;
  readonly projectId: ProjectId;
  readonly sourceType: SourceType;
  readonly displayName: LocalizedText;
  readonly canonicalUrl: string;
  readonly connectorRef: string;
  readonly capabilities: readonly SourceCapability[];
}

export type IdentifierRuleV1 =
  | {
      readonly kind: "prefix";
      readonly prefix: string;
      readonly caseSensitive: boolean;
    }
  | {
      readonly kind: "regex";
      readonly pattern: string;
      readonly flags?: string;
    };

export interface NativeStateDefinitionV1 {
  readonly key: string;
  readonly displayName: LocalizedText;
  readonly terminal: boolean;
}

export interface ProjectStatusDefinitionV1 {
  /** Must be namespaced as `${projectId}:status:${localKey}`. */
  readonly key: ProjectStatusKey;
  readonly displayName: LocalizedText;
  readonly terminal: boolean;
  readonly applicableArtifactTypes: readonly ArtifactTypeKey[];
}

export interface NativeStateMapStatusPolicyConfigV1 {
  readonly ref: "native-state-map@1";
  readonly mapping: Readonly<Record<string, ProjectStatusKey>>;
}

export interface GitHubPullRequestStatusPolicyConfigV1 {
  readonly ref: "github-pull-request-status@1";
  readonly output: {
    readonly open: ProjectStatusKey;
    readonly merged: ProjectStatusKey;
    readonly closedWithoutMerge: ProjectStatusKey;
  };
}

/**
 * Adding a new policy requires adding a new discriminated member and
 * deterministic implementation. A prompt or arbitrary expression cannot become
 * a status policy implicitly.
 */
export type StatusPolicyConfigV1 =
  | NativeStateMapStatusPolicyConfigV1
  | GitHubPullRequestStatusPolicyConfigV1;

export interface ArtifactTypeDefinitionV1 {
  readonly key: ArtifactTypeKey;
  readonly displayName: LocalizedText;
  readonly sourceInstanceIds: readonly SourceInstanceId[];
  readonly identifierRules: readonly IdentifierRuleV1[];
  readonly nativeStateDefinitions: readonly NativeStateDefinitionV1[];
  readonly statusPolicy?: StatusPolicyConfigV1;
}

export interface CommunityProfileV1 {
  readonly schemaVersion: 1;
  readonly projectId: ProjectId;
  readonly version: ProfileVersion;
  readonly displayName: LocalizedText;
  readonly sourceInstances: readonly SourceInstanceV1[];
  readonly artifactTypeDefinitions: readonly ArtifactTypeDefinitionV1[];
  readonly statusDefinitions: readonly ProjectStatusDefinitionV1[];
  readonly statusFacetLabel?: LocalizedText;
}

export interface ObservedNativeStateV1 {
  readonly key: string;
  readonly observedAt: IsoTimestamp;
  readonly evidenceEventId: EventId;
}

export type ActivityState = "active" | "quiet" | "closed";

export interface DerivedProjectStatusV1 {
  readonly statusKey: ProjectStatusKey;
  readonly projectId: ProjectId;
  readonly subjectArtifactId: ArtifactId;
  readonly policyRef: StatusPolicyConfigV1["ref"];
  readonly profileVersion: ProfileVersion;
  readonly evidenceEventIds: readonly EventId[];
  /** Supplied by the materialization controller; never read from wall clock. */
  readonly computedAt: IsoTimestamp;
}

export interface ArtifactV1 {
  readonly schemaVersion: 1;
  readonly id: ArtifactId;
  readonly projectId: ProjectId;
  readonly sourceInstanceId: SourceInstanceId;
  readonly artifactType: ArtifactTypeKey;
  readonly externalKey: string;
  readonly title: string;
  readonly canonicalUrl: string;
  readonly nativeState: ObservedNativeStateV1;
  readonly projectStatus?: DerivedProjectStatusV1;
  readonly activityState?: ActivityState;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

export interface SourceIdentityV1 {
  readonly schemaVersion: 1;
  readonly id: SourceIdentityId;
  readonly projectId: ProjectId;
  readonly sourceInstanceId: SourceInstanceId;
  readonly externalId: string;
  readonly displayName: string;
  readonly canonicalUrl?: string;
}

export interface ContributorV1 {
  readonly schemaVersion: 1;
  readonly id: ContributorId;
  readonly projectId: ProjectId;
  readonly displayName: string;
  readonly sourceIdentityIds: readonly SourceIdentityId[];
}

export interface ThreadV1 {
  readonly schemaVersion: 1;
  readonly id: ThreadId;
  readonly projectId: ProjectId;
  readonly sourceInstanceId: SourceInstanceId;
  readonly threadType: string;
  readonly artifactIds: readonly ArtifactId[];
  readonly canonicalUrl: string;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

export interface MessageV1 {
  readonly schemaVersion: 1;
  readonly id: MessageId;
  readonly projectId: ProjectId;
  readonly threadId: ThreadId;
  readonly sourceIdentityId: SourceIdentityId;
  readonly sourceTimestamp: IsoTimestamp;
  readonly canonicalUrl: string;
  readonly contentRef: string;
  readonly sourceVersion: string;
}

export type RelationshipMethod = "explicit" | "deterministic" | "inferred" | "curated";
export type ReviewStatus = "unreviewed" | "approved" | "rejected";

export interface RelationshipV1 {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly projectId: ProjectId;
  readonly fromEntityId: string;
  readonly toEntityId: string;
  readonly relationshipType: string;
  readonly method: RelationshipMethod;
  readonly evidenceEventIds: readonly EventId[];
  /** Required for inferred relationships; omitted for exact methods. */
  readonly confidence?: number;
  readonly reviewStatus: ReviewStatus;
  readonly derivationVersion: string;
}

export interface SourceSpanV1 {
  readonly entityId: string;
  readonly startOffset: number;
  readonly endOffset: number;
}

export interface GeneratedClaimV1 {
  readonly id: string;
  readonly text: string;
  readonly evidence: readonly SourceSpanV1[];
}

export interface GenerationMetadataV1 {
  readonly provider: string;
  readonly model: string;
  readonly promptVersion: string;
  readonly inputEntityIds: readonly string[];
  readonly generatedAt: IsoTimestamp;
  readonly reviewStatus: ReviewStatus;
}

export type EntityType = "artifact" | "thread" | "message" | "contributor";
export type EventType =
  | "observed"
  | "created"
  | "updated"
  | "state-changed"
  | "linked";

export interface EventEnvelopeV1 {
  readonly schemaVersion: 1;
  readonly id: EventId;
  readonly projectId: ProjectId;
  readonly sourceType: SourceType;
  readonly sourceInstanceId: SourceInstanceId;
  readonly entityType: EntityType;
  readonly entityId: string;
  readonly eventType: EventType;
  readonly sourceCursor: string;
  readonly sourceTimestamp: IsoTimestamp;
  readonly observedAt: IsoTimestamp;
  readonly canonicalUrl: string;
  readonly payloadRef: string;
  readonly sourceConnectorVersion: string;
  readonly communityProfileVersion: ProfileVersion;
}

export interface ArtifactStateChangedEventV1 extends EventEnvelopeV1 {
  readonly entityType: "artifact";
  readonly eventType: "state-changed";
  readonly entityId: ArtifactId;
  readonly data: {
    readonly artifactType: ArtifactTypeKey;
    readonly before: string | null;
    readonly after: string;
  };
}

export interface GeneralDomainEventV1 extends EventEnvelopeV1 {
  readonly eventType: Exclude<EventType, "state-changed">;
  readonly data: Readonly<Record<string, unknown>>;
}

export type DomainEventV1 = ArtifactStateChangedEventV1 | GeneralDomainEventV1;

export interface StatusPolicyInputV1 {
  readonly profile: CommunityProfileV1;
  readonly artifact: ArtifactV1;
  readonly events: readonly DomainEventV1[];
  readonly computedAt: IsoTimestamp;
}
