import type {
  ArtifactStateChangedEventV1,
  ArtifactV1,
  CommunityProfileV1,
} from "../src/v1";
import { defineCommunityProfileV1 } from "../src/v1";

export const githubOnlyProfile = defineCommunityProfileV1({
  schemaVersion: 1,
  projectId: "github-only-demo",
  version: "github-only-demo@1",
  displayName: {
    en: "GitHub-only Demo",
    "zh-Hant": "僅使用 GitHub 的示範專案",
  },
  sourceInstances: [
    {
      id: "github:demo/community",
      projectId: "github-only-demo",
      sourceType: "code-host",
      displayName: { en: "GitHub" },
      canonicalUrl: "https://github.com/demo/community",
      connectorRef: "github@1",
      capabilities: ["pull-requests", "reviews", "comments", "webhooks"],
    },
  ],
  artifactTypeDefinitions: [
    {
      key: "pull-request",
      displayName: { en: "Pull request", "zh-Hant": "Pull Request" },
      sourceInstanceIds: ["github:demo/community"],
      identifierRules: [{ kind: "prefix", prefix: "PR-", caseSensitive: false }],
      nativeStateDefinitions: [
        { key: "open", displayName: { en: "Open" }, terminal: false },
        { key: "merged", displayName: { en: "Merged" }, terminal: true },
        { key: "closed", displayName: { en: "Closed" }, terminal: true },
      ],
      statusPolicy: {
        ref: "github-pull-request-status@1",
        output: {
          open: "github-only-demo:status:open",
          merged: "github-only-demo:status:merged",
          closedWithoutMerge: "github-only-demo:status:closed-without-merge",
        },
      },
    },
  ],
  statusDefinitions: [
    {
      key: "github-only-demo:status:open",
      displayName: { en: "Open", "zh-Hant": "進行中" },
      terminal: false,
      applicableArtifactTypes: ["pull-request"],
    },
    {
      key: "github-only-demo:status:merged",
      displayName: { en: "Merged", "zh-Hant": "已合併" },
      terminal: true,
      applicableArtifactTypes: ["pull-request"],
    },
    {
      key: "github-only-demo:status:closed-without-merge",
      displayName: { en: "Closed without merge", "zh-Hant": "未合併結束" },
      terminal: true,
      applicableArtifactTypes: ["pull-request"],
    },
  ],
  statusFacetLabel: {
    en: "Pull request status",
    "zh-Hant": "Pull Request 狀態",
  },
} satisfies CommunityProfileV1);

export const pullRequestArtifact: ArtifactV1 = {
  schemaVersion: 1,
  id: "github-only-demo:pull-request:204",
  projectId: "github-only-demo",
  sourceInstanceId: "github:demo/community",
  artifactType: "pull-request",
  externalKey: "204",
  title: "Replace polling with repository webhooks",
  canonicalUrl: "https://github.com/demo/community/pull/204",
  nativeState: {
    key: "open",
    observedAt: "2026-08-17T16:30:00Z",
    evidenceEventId: "event:pr-204-open",
  },
  createdAt: "2026-08-17T14:00:00Z",
  updatedAt: "2026-08-17T16:40:00Z",
};

export const pullRequestMergedEvent: ArtifactStateChangedEventV1 = {
  schemaVersion: 1,
  id: "event:pr-204-merged",
  projectId: "github-only-demo",
  sourceType: "code-host",
  sourceInstanceId: "github:demo/community",
  entityType: "artifact",
  entityId: "github-only-demo:pull-request:204",
  eventType: "state-changed",
  sourceCursor: "pull-request:204:merged:2026-08-17T16:40:00Z",
  sourceTimestamp: "2026-08-17T16:40:00Z",
  observedAt: "2026-08-17T16:40:05Z",
  canonicalUrl: "https://github.com/demo/community/pull/204",
  payloadRef: "content-addressed://sha256/demo-pr-204-merged",
  sourceConnectorVersion: "github@1",
  communityProfileVersion: "github-only-demo@1",
  data: {
    artifactType: "pull-request",
    before: "open",
    after: "merged",
  },
};
