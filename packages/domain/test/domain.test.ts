import { describe, expect, test } from "bun:test";
import {
  defineCommunityProfileV1,
  deriveProjectStatusV1,
  DomainValidationError,
  parseDomainEventV1,
} from "../src/v1";
import {
  githubOnlyProfile,
  pullRequestArtifact,
  pullRequestMergedEvent,
} from "./fixtures";

describe("CommunityProfileV1", () => {
  test("does not require Jira, a wiki, or a mailing list", () => {
    expect(githubOnlyProfile.sourceInstances.map((source) => source.sourceType)).toEqual([
      "code-host",
    ]);
  });

  test("rejects an artifact type that references a missing source", () => {
    expect(() =>
      defineCommunityProfileV1({
        ...githubOnlyProfile,
        artifactTypeDefinitions: [
          {
            ...githubOnlyProfile.artifactTypeDefinitions[0],
            sourceInstanceIds: ["github:missing/repository"],
          },
        ],
      }),
    ).toThrow(DomainValidationError);
  });

  test("rejects a policy output that is not applicable to its artifact type", () => {
    expect(() =>
      defineCommunityProfileV1({
        ...githubOnlyProfile,
        statusDefinitions: githubOnlyProfile.statusDefinitions.map((status) =>
          status.key === "github-only-demo:status:merged"
            ? { ...status, applicableArtifactTypes: [] }
            : status,
        ),
      }),
    ).toThrow(DomainValidationError);
  });
});

describe("github-pull-request-status@1", () => {
  test("derives merged status with the merge event as evidence", () => {
    const status = deriveProjectStatusV1({
      profile: githubOnlyProfile,
      artifact: pullRequestArtifact,
      events: [pullRequestMergedEvent],
      computedAt: "2026-08-17T16:41:00Z",
    });

    expect(status).toEqual({
      statusKey: "github-only-demo:status:merged",
      projectId: "github-only-demo",
      subjectArtifactId: "github-only-demo:pull-request:204",
      policyRef: "github-pull-request-status@1",
      profileVersion: "github-only-demo@1",
      evidenceEventIds: ["event:pr-204-merged"],
      computedAt: "2026-08-17T16:41:00Z",
    });
  });

  test("is deterministic for the same inputs", () => {
    const input = {
      profile: githubOnlyProfile,
      artifact: pullRequestArtifact,
      events: [pullRequestMergedEvent],
      computedAt: "2026-08-17T16:41:00Z",
    } as const;

    expect(deriveProjectStatusV1(input)).toEqual(deriveProjectStatusV1(input));
  });

  test("does not apply a profile to an artifact from another project", () => {
    expect(
      deriveProjectStatusV1({
        profile: githubOnlyProfile,
        artifact: { ...pullRequestArtifact, projectId: "another-project" },
        events: [pullRequestMergedEvent],
        computedAt: "2026-08-17T16:41:00Z",
      }),
    ).toBeNull();
  });
});

describe("event runtime boundary", () => {
  test("parses a valid normalized event", () => {
    expect(parseDomainEventV1(pullRequestMergedEvent)).toEqual(pullRequestMergedEvent);
  });

  test("rejects non-UTC timestamps", () => {
    expect(() =>
      parseDomainEventV1({
        ...pullRequestMergedEvent,
        sourceTimestamp: "2026-08-17 16:40:00",
      }),
    ).toThrow(DomainValidationError);
  });

  test("rejects unknown discriminant values", () => {
    expect(() =>
      parseDomainEventV1({
        ...pullRequestMergedEvent,
        eventType: "llm-guessed-state",
      }),
    ).toThrow(DomainValidationError);
  });
});
