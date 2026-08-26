import type {
  ArtifactStateChangedEventV1,
  DerivedProjectStatusV1,
  StatusPolicyInputV1,
} from "./contracts";

function compareEvents(
  left: ArtifactStateChangedEventV1,
  right: ArtifactStateChangedEventV1,
): number {
  return left.sourceTimestamp.localeCompare(right.sourceTimestamp) || left.id.localeCompare(right.id);
}

/**
 * Derives project-owned status from normalized evidence only. It never reads a
 * clock, calls a model, or inspects an upstream-specific raw payload.
 */
export function deriveProjectStatusV1(
  input: StatusPolicyInputV1,
): DerivedProjectStatusV1 | null {
  if (input.artifact.projectId !== input.profile.projectId) return null;

  const artifactType = input.profile.artifactTypeDefinitions.find(
    (definition) => definition.key === input.artifact.artifactType,
  );
  if (!artifactType?.sourceInstanceIds.includes(input.artifact.sourceInstanceId)) return null;
  const policy = artifactType?.statusPolicy;
  if (!policy) return null;

  let statusKey: string | undefined;
  let evidenceEventId = input.artifact.nativeState.evidenceEventId;

  switch (policy.ref) {
    case "native-state-map@1":
      statusKey = policy.mapping[input.artifact.nativeState.key];
      break;

    case "github-pull-request-status@1": {
      const latestStateEvent = input.events
        .filter(
          (event): event is ArtifactStateChangedEventV1 =>
            event.eventType === "state-changed" &&
            event.entityType === "artifact" &&
            event.projectId === input.profile.projectId &&
            event.entityId === input.artifact.id &&
            event.data.artifactType === input.artifact.artifactType,
        )
        .sort(compareEvents)
        .at(-1);

      const nativeState = latestStateEvent?.data.after ?? input.artifact.nativeState.key;
      evidenceEventId = latestStateEvent?.id ?? evidenceEventId;

      if (nativeState === "open") statusKey = policy.output.open;
      if (nativeState === "merged") statusKey = policy.output.merged;
      if (nativeState === "closed") statusKey = policy.output.closedWithoutMerge;
      break;
    }
  }

  if (!statusKey) return null;

  return {
    statusKey,
    projectId: input.profile.projectId,
    subjectArtifactId: input.artifact.id,
    policyRef: policy.ref,
    profileVersion: input.profile.version,
    evidenceEventIds: [evidenceEventId],
    computedAt: input.computedAt,
  };
}
