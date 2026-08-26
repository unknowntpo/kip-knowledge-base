import type {
  ArtifactTypeDefinitionV1,
  CommunityProfileV1,
  DomainEventV1,
  ProjectStatusKey,
  ProjectStatusDefinitionV1,
  SourceInstanceV1,
  StatusPolicyConfigV1,
} from "./contracts";

export class DomainValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid domain value:\n- ${issues.join("\n- ")}`);
    this.name = "DomainValidationError";
    this.issues = issues;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoTimestamp(value: unknown): value is string {
  return (
    isNonEmptyString(value) &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function isHttpUrl(value: unknown): value is string {
  return isNonEmptyString(value) && /^https?:\/\/[^\s]+$/.test(value);
}

function duplicateValues(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

function policyOutputKeys(policy: StatusPolicyConfigV1): readonly ProjectStatusKey[] {
  switch (policy.ref) {
    case "native-state-map@1":
      return Object.values(policy.mapping);
    case "github-pull-request-status@1":
      return [policy.output.open, policy.output.merged, policy.output.closedWithoutMerge];
  }
}

function validateArtifactType(
  artifactType: ArtifactTypeDefinitionV1,
  sourcesById: ReadonlyMap<string, SourceInstanceV1>,
  statusesByKey: ReadonlyMap<string, ProjectStatusDefinitionV1>,
): readonly string[] {
  const issues: string[] = [];

  for (const sourceId of artifactType.sourceInstanceIds) {
    if (!sourcesById.has(sourceId)) {
      issues.push(`artifact type ${artifactType.key} references unknown source ${sourceId}`);
    }
  }

  if (artifactType.statusPolicy) {
    for (const statusKey of policyOutputKeys(artifactType.statusPolicy)) {
      const status = statusesByKey.get(statusKey);
      if (!status) {
        issues.push(`policy ${artifactType.statusPolicy.ref} emits unknown status ${statusKey}`);
      } else if (!status.applicableArtifactTypes.includes(artifactType.key)) {
        issues.push(
          `policy ${artifactType.statusPolicy.ref} emits ${statusKey}, which does not apply to ${artifactType.key}`,
        );
      }
    }

    const nativeStateKeys = new Set(
      artifactType.nativeStateDefinitions.map((nativeState) => nativeState.key),
    );

    if (artifactType.statusPolicy.ref === "native-state-map@1") {
      for (const nativeState of Object.keys(artifactType.statusPolicy.mapping)) {
        if (!nativeStateKeys.has(nativeState)) {
          issues.push(
            `native-state-map@1 maps unknown native state ${artifactType.key}:${nativeState}`,
          );
        }
      }
    }

    if (artifactType.statusPolicy.ref === "github-pull-request-status@1") {
      const hasCodeHost = artifactType.sourceInstanceIds.some((sourceId) =>
        sourcesById.get(sourceId)?.sourceType === "code-host" &&
        sourcesById.get(sourceId)?.capabilities.includes("pull-requests"),
      );
      if (!hasCodeHost) {
        issues.push(
          `artifact type ${artifactType.key} uses GitHub PR policy without a pull-request code host`,
        );
      }
      for (const requiredState of ["open", "merged", "closed"]) {
        if (!nativeStateKeys.has(requiredState)) {
          issues.push(
            `GitHub PR artifact type ${artifactType.key} is missing native state ${requiredState}`,
          );
        }
      }
    }
  }

  return issues;
}

export function validateCommunityProfileV1(profile: CommunityProfileV1): readonly string[] {
  const issues: string[] = [];
  const sourceIds = profile.sourceInstances.map((source) => source.id);
  const artifactTypeKeys = profile.artifactTypeDefinitions.map((type) => type.key);
  const statusKeys = profile.statusDefinitions.map((status) => status.key);

  for (const duplicate of duplicateValues(sourceIds)) issues.push(`duplicate source ${duplicate}`);
  for (const duplicate of duplicateValues(artifactTypeKeys)) {
    issues.push(`duplicate artifact type ${duplicate}`);
  }
  for (const duplicate of duplicateValues(statusKeys)) issues.push(`duplicate status ${duplicate}`);

  for (const source of profile.sourceInstances) {
    if (source.projectId !== profile.projectId) {
      issues.push(`source ${source.id} belongs to ${source.projectId}, not ${profile.projectId}`);
    }
  }

  const expectedStatusPrefix = `${profile.projectId}:status:`;
  for (const status of profile.statusDefinitions) {
    if (!status.key.startsWith(expectedStatusPrefix)) {
      issues.push(`status ${status.key} must start with ${expectedStatusPrefix}`);
    }
    for (const artifactType of status.applicableArtifactTypes) {
      if (!artifactTypeKeys.includes(artifactType)) {
        issues.push(`status ${status.key} references unknown artifact type ${artifactType}`);
      }
    }
  }

  const sourcesById = new Map(profile.sourceInstances.map((source) => [source.id, source]));
  const statusesByKey = new Map(profile.statusDefinitions.map((status) => [status.key, status]));
  for (const artifactType of profile.artifactTypeDefinitions) {
    issues.push(...validateArtifactType(artifactType, sourcesById, statusesByKey));
  }

  return issues;
}

export function defineCommunityProfileV1<T extends CommunityProfileV1>(profile: T): T {
  const issues = validateCommunityProfileV1(profile);
  if (issues.length > 0) throw new DomainValidationError(issues);
  return profile;
}

export function parseDomainEventV1(value: unknown): DomainEventV1 {
  const issues: string[] = [];
  if (!isRecord(value)) throw new DomainValidationError(["event must be an object"]);

  const requiredStrings = [
    "id",
    "projectId",
    "sourceType",
    "sourceInstanceId",
    "entityType",
    "entityId",
    "eventType",
    "sourceCursor",
    "canonicalUrl",
    "payloadRef",
    "sourceConnectorVersion",
    "communityProfileVersion",
  ] as const;
  for (const key of requiredStrings) {
    if (!isNonEmptyString(value[key])) issues.push(`${key} must be a non-empty string`);
  }

  if (value.schemaVersion !== 1) issues.push("schemaVersion must equal 1");
  if (
    !["wiki", "issue-tracker", "code-host", "mailing-list", "forum", "chat", "other"].includes(
      String(value.sourceType),
    )
  ) {
    issues.push("sourceType is not supported by schema v1");
  }
  if (!["artifact", "thread", "message", "contributor"].includes(String(value.entityType))) {
    issues.push("entityType is not supported by schema v1");
  }
  if (
    !["observed", "created", "updated", "state-changed", "linked"].includes(
      String(value.eventType),
    )
  ) {
    issues.push("eventType is not supported by schema v1");
  }
  if (!isIsoTimestamp(value.sourceTimestamp)) issues.push("sourceTimestamp must be UTC ISO-8601");
  if (!isIsoTimestamp(value.observedAt)) issues.push("observedAt must be UTC ISO-8601");
  if (!isHttpUrl(value.canonicalUrl)) issues.push("canonicalUrl must be an HTTP(S) URL");
  if (!isRecord(value.data)) issues.push("data must be an object");

  if (value.eventType === "state-changed") {
    if (value.entityType !== "artifact") {
      issues.push("state-changed event must target an artifact");
    }
    if (isRecord(value.data)) {
      if (!isNonEmptyString(value.data.artifactType)) {
        issues.push("state-changed data.artifactType must be a non-empty string");
      }
      if (!isNonEmptyString(value.data.after)) {
        issues.push("state-changed data.after must be a non-empty string");
      }
      if (!(value.data.before === null || isNonEmptyString(value.data.before))) {
        issues.push("state-changed data.before must be null or a non-empty string");
      }
    }
  }

  if (issues.length > 0) throw new DomainValidationError(issues);
  return value as unknown as DomainEventV1;
}
