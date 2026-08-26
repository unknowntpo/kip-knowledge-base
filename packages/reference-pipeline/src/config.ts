export interface GitHubProjectProfile {
  readonly owner: string;
  readonly repo: string;
  readonly projectId: string;
  readonly projectKey: string;
  readonly label: string;
  readonly sourceInstanceId: string;
  readonly profileVersion: string;
  readonly statusPolicyRef: "github-issue-or-pull-request-status@1";
}

export const githubProjectProfiles: readonly GitHubProjectProfile[] = [
  {
    owner: "apache",
    repo: "kafka",
    projectId: "apache-kafka",
    projectKey: "kafka",
    label: "Apache Kafka",
    sourceInstanceId: "kafka:github",
    profileVersion: "apache-kafka@github-live-1",
    statusPolicyRef: "github-issue-or-pull-request-status@1",
  },
  {
    owner: "apache",
    repo: "datafusion",
    projectId: "apache-datafusion",
    projectKey: "datafusion",
    label: "Apache DataFusion",
    sourceInstanceId: "datafusion:github",
    profileVersion: "apache-datafusion@github-live-1",
    statusPolicyRef: "github-issue-or-pull-request-status@1",
  },
] as const;

export interface ReferenceMaterializationConfig {
  readonly materializedAt: string;
  readonly activityWindowDays: number;
  readonly projectProfiles: readonly GitHubProjectProfile[];
  readonly materializerRevision: string;
  readonly clusteringRevision: string;
  readonly keyPointRevision: string;
}

export function defaultReferenceConfig(materializedAt: string): ReferenceMaterializationConfig {
  return {
    materializedAt,
    activityWindowDays: 30,
    projectProfiles: githubProjectProfiles,
    materializerRevision: "github-reference-materializer@1",
    clusteringRevision: "github-thread@1",
    keyPointRevision: "github-source-extract@1",
  };
}
