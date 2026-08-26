import { describe, expect, test } from "bun:test";
import type {
  ActivityEventFixture,
  FeedGroupingProjectionInput,
  ModelClusterSuggestionFixture,
  RecordRelationshipFixture,
  SourceRecordFixture,
} from "./feed-grouping.behavior-contract";
import { groupFeedRecords } from "../src/v1/feed-grouping";

const window = {
  startedAt: "2026-08-18T00:00:00Z",
  endedAt: "2026-08-20T00:00:00Z",
} as const;

function root(
  id: string,
  projectId: string,
  sourceId: string,
  title: string,
): SourceRecordFixture {
  return {
    id,
    projectId,
    sourceId,
    title,
    canonicalUrl: `https://example.test/${id.replaceAll(":", "/")}`,
    sourceVersion: `${id}@1`,
  };
}

function child(
  id: string,
  parent: SourceRecordFixture,
): SourceRecordFixture {
  return {
    id,
    projectId: parent.projectId,
    sourceId: parent.sourceId,
    parentRecordId: parent.id,
    canonicalUrl: `https://example.test/${id.replaceAll(":", "/")}`,
    sourceVersion: `${id}@1`,
  };
}

function slackMessage(
  id: string,
  projectId: string,
  sourceId: string,
  textPreview: string,
  parentRecordId?: string,
): SourceRecordFixture {
  return {
    id,
    projectId,
    sourceId,
    ...(parentRecordId === undefined ? {} : { parentRecordId }),
    textPreview,
    canonicalUrl: `https://example.test/${id.replaceAll(":", "/")}`,
    sourceVersion: `${id}@1`,
  };
}

function exactRelationship(
  id: string,
  kind: "discusses" | "implements" | "fixes" | "duplicates",
  from: SourceRecordFixture,
  to: SourceRecordFixture,
): RecordRelationshipFixture {
  return {
    id,
    projectId: from.projectId,
    fromRecordId: from.id,
    toRecordId: to.id,
    kind,
    provenance: {
      kind: "deterministic-rule",
      ruleRevision: "community-fixture-link@1",
    },
  };
}

function input(
  records: readonly SourceRecordFixture[],
  relationships: readonly RecordRelationshipFixture[] = [],
  activityEvents: readonly ActivityEventFixture[] = [],
  modelSuggestions: readonly ModelClusterSuggestionFixture[] = [],
): FeedGroupingProjectionInput {
  return {
    records,
    relationships,
    activityEvents,
    modelSuggestions,
    minimumModelConfidence: 0.9,
    window,
    clusteringRevision: "feed-cluster@1",
  };
}

describe("FeedRecordGroup community case matrix", () => {
  test("C2: DataFusion can be represented as GitHub-only", () => {
    const issue = root(
      "datafusion:github:issue:predicate-pushdown",
      "apache-datafusion",
      "datafusion:github",
      "Improve Parquet predicate pushdown",
    );
    const pullRequest = root(
      "datafusion:github:pr:predicate-pushdown",
      "apache-datafusion",
      "datafusion:github",
      "Push predicates into Parquet scans",
    );
    const review = child(
      "datafusion:github:review:predicate-pushdown",
      pullRequest,
    );

    const stories = groupFeedRecords(
      input(
        [issue, pullRequest, review],
        [
          exactRelationship(
            "relationship:datafusion-pr-implements-issue",
            "implements",
            pullRequest,
            issue,
          ),
        ],
      ),
    );

    expect(stories).toHaveLength(1);
    expect(stories[0].recordIds).toEqual([issue.id, pullRequest.id, review.id]);
    expect(
      new Set(
        stories[0].sourceReferences.map((reference) =>
          reference.recordId.split(":").slice(0, 2).join(":"),
        ),
      ),
    ).toEqual(new Set(["datafusion:github"]));
  });

  test("C3: Flink exact relationships converge transitively", () => {
    const flip = root(
      "flink:wiki:flip:source-api",
      "apache-flink",
      "flink:wiki",
      "FLIP: Redesign the Source API",
    );
    const mail = root(
      "flink:mail:thread:source-api",
      "apache-flink",
      "flink:dev-mail",
      "[DISCUSS] Redesign the Source API",
    );
    const mailReply = child("flink:mail:reply:source-api:1", mail);
    const jira = root(
      "flink:jira:issue:source-api",
      "apache-flink",
      "flink:jira",
      "Implement the redesigned source API",
    );
    const pullRequest = root(
      "flink:github:pr:source-api",
      "apache-flink",
      "flink:github",
      "Implement source API interfaces",
    );

    const stories = groupFeedRecords(
      input(
        [flip, mail, mailReply, jira, pullRequest],
        [
          exactRelationship(
            "relationship:flink-mail-discusses-flip",
            "discusses",
            mail,
            flip,
          ),
          exactRelationship(
            "relationship:flink-pr-implements-flip",
            "implements",
            pullRequest,
            flip,
          ),
          exactRelationship(
            "relationship:flink-pr-fixes-jira",
            "fixes",
            pullRequest,
            jira,
          ),
        ],
      ),
    );

    expect(stories).toHaveLength(1);
    expect(stories[0].rootRecordIds).toHaveLength(4);
    expect(stories[0].recordIds).toHaveLength(5);
    expect(stories[0].recordIds).toContain(mailReply.id);
    expect(stories[0].grouping.relationshipIds).toHaveLength(3);
  });

  test("C4: Spark can use Jira and GitHub without a proposal page", () => {
    const jira = root(
      "spark:jira:issue:adaptive-query",
      "apache-spark",
      "spark:jira",
      "Improve adaptive query planning",
    );
    const pullRequest = root(
      "spark:github:pr:adaptive-query",
      "apache-spark",
      "spark:github",
      "Improve adaptive query planning",
    );
    const review = child("spark:github:review:adaptive-query:1", pullRequest);

    const stories = groupFeedRecords(
      input(
        [jira, pullRequest, review],
        [
          exactRelationship(
            "relationship:spark-pr-fixes-jira",
            "fixes",
            pullRequest,
            jira,
          ),
        ],
      ),
    );

    expect(stories).toHaveLength(1);
    expect(stories[0].rootRecordIds).toEqual([pullRequest.id, jira.id]);
    expect(stories[0].recordIds).toContain(review.id);
  });

  test("C5: a mailing-list-only community needs no synthetic issue", () => {
    const firstEmail = root(
      "mail-only:mail:message:root",
      "mail-only-community",
      "mail-only:dev-list",
      "[DISCUSS] Introduce checkpoint metadata",
    );
    const replyOne = child("mail-only:mail:message:reply:1", firstEmail);
    const replyTwo = child("mail-only:mail:message:reply:2", firstEmail);

    const stories = groupFeedRecords(
      input([firstEmail, replyOne, replyTwo]),
    );

    expect(stories).toHaveLength(1);
    expect(stories[0].rootRecordIds).toEqual([firstEmail.id]);
    expect(stories[0].recordIds).toHaveLength(3);
    expect(stories[0].recordIds).toEqual(
      expect.arrayContaining([firstEmail.id, replyOne.id, replyTwo.id]),
    );
  });

  test("C6: Slack-only chat uses source text when no native title exists", () => {
    const rootMessage = slackMessage(
      "slack-only:slack:message:root",
      "slack-only-community",
      "slack-only:engineering-channel",
      "Should we replace polling with repository webhooks?",
    );
    const reply = slackMessage(
      "slack-only:slack:message:reply:1",
      rootMessage.projectId,
      rootMessage.sourceId,
      "Webhooks would reduce sync delay, but we need a backfill path.",
      rootMessage.id,
    );

    const stories = groupFeedRecords(input([rootMessage, reply]));

    expect(stories).toHaveLength(1);
    expect(stories[0].title).toEqual({
      kind: "source",
      text: rootMessage.textPreview,
      sourceRecordId: rootMessage.id,
    });
    expect(stories[0].recordIds).toEqual(
      expect.arrayContaining([rootMessage.id, reply.id]),
    );
  });

  test("C7: a Slack discussion can group with a GitHub issue", () => {
    const slackRoot = slackMessage(
      "hybrid:slack:message:webhook-root",
      "hybrid-community",
      "hybrid:slack:engineering",
      "The polling job is falling behind; should we use webhooks?",
    );
    const slackReply = slackMessage(
      "hybrid:slack:message:webhook-reply",
      slackRoot.projectId,
      slackRoot.sourceId,
      "I opened an issue with the retry and backfill requirements.",
      slackRoot.id,
    );
    const issue = root(
      "hybrid:github:issue:webhook-ingestion",
      "hybrid-community",
      "hybrid:github",
      "Replace polling with repository webhooks",
    );

    const stories = groupFeedRecords(
      input(
        [slackRoot, slackReply, issue],
        [
          exactRelationship(
            "relationship:slack-discusses-github-issue",
            "discusses",
            slackRoot,
            issue,
          ),
        ],
      ),
    );

    expect(stories).toHaveLength(1);
    expect(stories[0].rootRecordIds).toEqual([issue.id, slackRoot.id]);
    expect(stories[0].recordIds).toContain(slackReply.id);
    expect(stories[0].sourceReferences).toHaveLength(3);
    expect(stories[0].sourceReferences).toEqual(
      expect.arrayContaining([
        { recordId: issue.id, canonicalUrl: issue.canonicalUrl },
        { recordId: slackRoot.id, canonicalUrl: slackRoot.canonicalUrl },
        { recordId: slackReply.id, canonicalUrl: slackReply.canonicalUrl },
      ]),
    );
  });

  test("C8: Kafka, DataFusion, Flink, and Spark share a feed without mixing", () => {
    const kafka = root(
      "kafka:wiki:kip:500",
      "apache-kafka",
      "kafka:wiki",
      "KIP-500: Replace ZooKeeper with a Metadata Quorum",
    );
    const datafusion = root(
      "datafusion:github:issue:predicate-pushdown",
      "apache-datafusion",
      "datafusion:github",
      "Improve Parquet predicate pushdown",
    );
    const flink = root(
      "flink:wiki:flip:source-api",
      "apache-flink",
      "flink:wiki",
      "FLIP: Redesign the Source API",
    );
    const spark = root(
      "spark:jira:issue:adaptive-query",
      "apache-spark",
      "spark:jira",
      "Improve adaptive query planning",
    );
    const records = [kafka, datafusion, flink, spark] as const;
    const events: ActivityEventFixture[] = [
      ...[1, 2, 3].map((sequence) => ({
        id: `event:datafusion:${sequence}`,
        projectId: datafusion.projectId,
        recordId: datafusion.id,
        occurredAt: `2026-08-19T10:0${sequence}:00Z`,
      })),
      ...[1, 2].map((sequence) => ({
        id: `event:flink:${sequence}`,
        projectId: flink.projectId,
        recordId: flink.id,
        occurredAt: `2026-08-19T11:0${sequence}:00Z`,
      })),
      {
        id: "event:kafka:1",
        projectId: kafka.projectId,
        recordId: kafka.id,
        occurredAt: "2026-08-19T12:01:00Z",
      },
    ];

    const stories = groupFeedRecords(
      input(records, [], events, [
        {
          id: "suggestion:invalid-global-cluster",
          projectId: "apache-kafka",
          rootRecordIds: [kafka.id, datafusion.id, flink.id, spark.id],
          evidenceRecordIds: [kafka.id, datafusion.id, flink.id, spark.id],
          modelRevision: "embedding-cluster@1",
          confidence: 0.99,
        },
      ]),
    );

    expect(stories).toHaveLength(4);
    expect(stories.map((story) => story.projectId)).toEqual([
      "apache-datafusion",
      "apache-flink",
      "apache-kafka",
      "apache-spark",
    ]);
    expect(stories.map((story) => story.activity.score)).toEqual([3, 2, 1, 0]);
    expect(stories.every((story) => story.rootRecordIds.length === 1)).toBe(true);
  });
});
