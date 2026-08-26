import { describe, expect, test } from "bun:test";
import type {
  FeedActivityEvent,
  FeedGroupingInput,
  FeedModelClusterSuggestion,
  FeedRecordGrouper,
  FeedRecordRelationship,
  FeedSourceRecord,
} from "../src/v1/feed-grouping";

export type SourceRecordFixture = FeedSourceRecord;
export type RecordRelationshipFixture = FeedRecordRelationship;
export type ActivityEventFixture = FeedActivityEvent;
export type ModelClusterSuggestionFixture = FeedModelClusterSuggestion;
export type FeedGroupingProjectionInput = FeedGroupingInput;

const window = {
  startedAt: "2026-08-18T00:00:00Z",
  endedAt: "2026-08-20T00:00:00Z",
} as const;

const datafusionIssue: FeedSourceRecord = {
  id: "datafusion:github:issue:1234",
  projectId: "apache-datafusion",
  sourceId: "datafusion:github",
  title: "Improve Parquet predicate pushdown",
  canonicalUrl: "https://github.com/apache/datafusion/issues/1234",
  sourceVersion: "issue-etag:1",
};

const datafusionComment: FeedSourceRecord = {
  id: "datafusion:github:comment:5001",
  projectId: "apache-datafusion",
  sourceId: "datafusion:github",
  parentRecordId: datafusionIssue.id,
  canonicalUrl: "https://github.com/apache/datafusion/issues/1234#issuecomment-5001",
  sourceVersion: "comment-etag:1",
};

const datafusionPullRequest: FeedSourceRecord = {
  id: "datafusion:github:pr:1300",
  projectId: "apache-datafusion",
  sourceId: "datafusion:github",
  title: "Push predicates into Parquet scans",
  canonicalUrl: "https://github.com/apache/datafusion/pull/1300",
  sourceVersion: "pr-etag:1",
};

const kafkaKip: FeedSourceRecord = {
  id: "kafka:wiki:kip:500",
  projectId: "apache-kafka",
  sourceId: "kafka:wiki",
  title: "KIP-500: Replace ZooKeeper with a Metadata Quorum",
  canonicalUrl: "https://cwiki.apache.org/confluence/display/KAFKA/KIP-500",
  sourceVersion: "confluence:42",
};

const kafkaMail: FeedSourceRecord = {
  id: "kafka:mail:thread:kip-500-discuss",
  projectId: "apache-kafka",
  sourceId: "kafka:dev-mail",
  title: "[DISCUSS] KIP-500",
  canonicalUrl: "https://lists.apache.org/thread/kip-500-discuss",
  sourceVersion: "mail:root:1",
};

const kafkaMailReply: FeedSourceRecord = {
  id: "kafka:mail:message:kip-500-reply-1",
  projectId: "apache-kafka",
  sourceId: "kafka:dev-mail",
  parentRecordId: kafkaMail.id,
  canonicalUrl: "https://lists.apache.org/thread/kip-500-discuss#reply-1",
  sourceVersion: "mail:reply:1",
};

const kafkaPullRequest: FeedSourceRecord = {
  id: "kafka:github:pr:10251",
  projectId: "apache-kafka",
  sourceId: "kafka:github",
  title: "Implement KIP-500 controller changes",
  canonicalUrl: "https://github.com/apache/kafka/pull/10251",
  sourceVersion: "pr-etag:10251-1",
};

function baseInput(overrides: Partial<FeedGroupingInput> = {}): FeedGroupingInput {
  return {
    records: [datafusionIssue, datafusionComment],
    relationships: [],
    activityEvents: [],
    minimumModelConfidence: 0.9,
    window,
    clusteringRevision: "feed-cluster@1",
    ...overrides,
  };
}

export function feedGroupingBehaviorContract(
  implementationName: string,
  group: FeedRecordGrouper,
): void {
  describe(`FeedRecordGroup behavior contract: ${implementationName}`, () => {
    test("F1: source-native children remain with their root without AI", () => {
      const groups = group(baseInput());

      expect(groups).toHaveLength(1);
      expect(groups[0].rootRecordIds).toEqual([datafusionIssue.id]);
      expect(groups[0].recordIds).toEqual([datafusionComment.id, datafusionIssue.id]);
    });

    test("F2: exact cross-source relationships group roots and descendants", () => {
      const discusses: FeedRecordRelationship = {
        id: "relationship:mail-discusses-kip-500",
        projectId: "apache-kafka",
        fromRecordId: kafkaMail.id,
        toRecordId: kafkaKip.id,
        kind: "discusses",
        provenance: { kind: "deterministic-rule", ruleRevision: "kip-subject-match@1" },
      };
      const implementsKip: FeedRecordRelationship = {
        id: "relationship:pr-implements-kip-500",
        projectId: "apache-kafka",
        fromRecordId: kafkaPullRequest.id,
        toRecordId: kafkaKip.id,
        kind: "implements",
        provenance: { kind: "source-link", sourceVersion: "pr-etag:10251-1" },
      };

      const groups = group(baseInput({
        records: [kafkaKip, kafkaMail, kafkaMailReply, kafkaPullRequest],
        relationships: [discusses, implementsKip],
      }));

      expect(groups).toHaveLength(1);
      expect(groups[0].recordIds).toContain(kafkaMailReply.id);
      expect(groups[0].grouping.relationshipIds).toEqual([discusses.id, implementsKip.id]);
    });

    test("F3: a plain reference does not merge two roots", () => {
      const groups = group(baseInput({
        records: [datafusionIssue, datafusionPullRequest],
        relationships: [{
          id: "relationship:pr-references-issue",
          projectId: "apache-datafusion",
          fromRecordId: datafusionPullRequest.id,
          toRecordId: datafusionIssue.id,
          kind: "references",
          provenance: { kind: "source-link", sourceVersion: "pr-etag:1" },
        }],
      }));

      expect(groups).toHaveLength(2);
    });

    test("F4: an accepted model suggestion groups only the derived feed view", () => {
      const relationships: readonly FeedRecordRelationship[] = [];
      const groups = group(baseInput({
        records: [datafusionIssue, datafusionPullRequest],
        relationships,
        modelSuggestions: [{
          id: "suggestion:predicate-pushdown",
          projectId: "apache-datafusion",
          rootRecordIds: [datafusionIssue.id, datafusionPullRequest.id],
          evidenceRecordIds: [datafusionIssue.id, datafusionPullRequest.id],
          modelRevision: "embedding-cluster@1",
          confidence: 0.96,
        }],
      }));

      expect(groups).toHaveLength(1);
      expect(groups[0].grouping.modelSuggestions[0]?.id).toBe("suggestion:predicate-pushdown");
      expect(relationships).toEqual([]);
    });

    test("F5: low-confidence and cross-project suggestions cannot merge roots", () => {
      const groups = group(baseInput({
        records: [datafusionIssue, datafusionPullRequest, kafkaKip],
        modelSuggestions: [
          {
            id: "suggestion:too-weak",
            projectId: "apache-datafusion",
            rootRecordIds: [datafusionIssue.id, datafusionPullRequest.id],
            evidenceRecordIds: [datafusionIssue.id],
            modelRevision: "embedding-cluster@1",
            confidence: 0.5,
          },
          {
            id: "suggestion:cross-project",
            projectId: "apache-datafusion",
            rootRecordIds: [datafusionIssue.id, kafkaKip.id],
            evidenceRecordIds: [datafusionIssue.id, kafkaKip.id],
            modelRevision: "embedding-cluster@1",
            confidence: 0.99,
          },
        ],
      }));

      expect(groups).toHaveLength(3);
    });

    test("F9: duplicate and shuffled inputs replay to identical output", () => {
      const event: FeedActivityEvent = {
        id: "event:comment-created:5001",
        projectId: "apache-datafusion",
        recordId: datafusionComment.id,
        occurredAt: "2026-08-19T10:00:00Z",
      };
      const ordered = group(baseInput({ activityEvents: [event] }));
      const shuffled = group(baseInput({
        records: [datafusionComment, datafusionIssue, datafusionComment],
        activityEvents: [event, event],
      }));

      expect(shuffled).toEqual(ordered);
    });

    test("F10: deterministic activity score orders hotter groups first", () => {
      const groups = group(baseInput({
        records: [datafusionIssue, datafusionPullRequest],
        activityEvents: [
          { id: "event:issue", projectId: "apache-datafusion", recordId: datafusionIssue.id, occurredAt: "2026-08-19T10:00:00Z" },
          { id: "event:pr-1", projectId: "apache-datafusion", recordId: datafusionPullRequest.id, occurredAt: "2026-08-19T11:00:00Z" },
          { id: "event:pr-2", projectId: "apache-datafusion", recordId: datafusionPullRequest.id, occurredAt: "2026-08-19T12:00:00Z" },
        ],
      }));

      expect(groups[0].rootRecordIds).toEqual([datafusionPullRequest.id]);
      expect(groups[0].activity.score).toBe(2);
    });

    test("F11: accepted relationships cannot cross project scope", () => {
      const groups = group(baseInput({
        records: [datafusionIssue, kafkaKip],
        relationships: [{
          id: "relationship:invalid-cross-project",
          projectId: "apache-datafusion",
          fromRecordId: datafusionIssue.id,
          toRecordId: kafkaKip.id,
          kind: "implements",
          provenance: { kind: "curated", curatorId: "maintainer" },
        }],
      }));

      expect(groups).toHaveLength(2);
    });
  });
}
