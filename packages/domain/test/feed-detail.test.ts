import { describe, expect, test } from "bun:test";
import {
  buildFeedDetail,
  feedDetailTimeline,
  type FeedEntry,
  type SourceRecordView,
} from "../src/v1/feed-detail";

const entry: FeedEntry = {
  id: "feed-entry:kip-405",
  projectId: "apache-kafka",
  title: "KIP-405: Kafka Tiered Storage",
  summary: "Recent changes clarify remote-storage limits and implementation progress.",
  sourceTitleRecordId: "kip-405:wiki",
  recordIds: ["kip-405:wiki", "kip-405:mail", "kip-405:pr"],
  highlightedRecordIds: ["kip-405:wiki"],
  reason: {
    kind: "watch-match",
    label: "Matches your tiered storage watch",
    watchId: "watch:tiered-storage",
    matchedRecordIds: ["kip-405:wiki"],
  },
  activity: { score: 3, evidenceEventIds: ["event:wiki", "event:mail", "event:pr"] },
  grouping: { relationshipIds: ["rel:pr-implements-kip"], clusteringRevision: "kafka-kip@1" },
};

const records: readonly SourceRecordView[] = [
  {
    id: "kip-405:mail",
    projectId: "apache-kafka",
    sourceInstanceId: "kafka:dev-mail",
    source: "mail",
    sourceType: "mailing-list",
    kind: "discussion",
    title: "Read latency and remote fetch discussion",
    excerpt: "Remote fetch must not change the normal consumer path.",
    author: "Kafka contributor",
    role: "participant",
    occurredAt: "2021-05-04T10:00:00Z",
    canonicalUrl: "https://lists.apache.org/thread/example",
    sourceVersion: "mail:1",
  },
  {
    id: "kip-405:pr",
    projectId: "apache-kafka",
    sourceInstanceId: "kafka:github",
    source: "github",
    sourceType: "code-host",
    kind: "pull-request",
    title: "Bound the remote fetch thread pool",
    excerpt: "Bounds concurrent remote fetch work per broker.",
    author: "Kafka contributor",
    role: "contributor",
    occurredAt: "2026-06-11T10:00:00Z",
    canonicalUrl: "https://github.com/apache/kafka/pull/16511",
    sourceVersion: "sha:example",
    artifactStatus: "merged",
  },
  {
    id: "kip-405:wiki",
    projectId: "apache-kafka",
    sourceInstanceId: "kafka:wiki",
    source: "wiki",
    sourceType: "wiki",
    kind: "page-update",
    title: "Clarify compacted-topic limitation",
    excerpt: "Tiered storage cannot yet be enabled on compacted topics.",
    author: "Satish Duggana",
    role: "proposer",
    occurredAt: "2026-08-04T10:00:00Z",
    canonicalUrl: "https://cwiki.apache.org/confluence/display/KAFKA/KIP-405",
    sourceVersion: "41",
    artifactStatus: "adopted",
  },
];

describe("FeedDetail", () => {
  test("opens the clicked FeedEntry with exactly its records", () => {
    const detail = buildFeedDetail({ entry, records });

    expect(detail.entry).toBe(entry);
    expect(detail.records.map((record) => record.id).sort()).toEqual([...entry.recordIds].sort());
    expect(detail.keyPoints).toEqual({
      status: "unavailable",
      reason: "generator-not-configured",
    });
  });

  test("derives a stable newest-first timeline from SourceRecords", () => {
    const detail = buildFeedDetail({ entry, records });

    expect(feedDetailTimeline(detail).map((record) => record.id)).toEqual([
      "kip-405:wiki",
      "kip-405:pr",
      "kip-405:mail",
    ]);
  });

  test("accepts cited key points and preserves their derivation", () => {
    const detail = buildFeedDetail({
      entry,
      records,
      keyPoints: {
        status: "generated",
        derivation: { kind: "source-extract", revision: "source-extract@1" },
        points: [
          {
            id: "point:compacted-topic",
            text: "Compacted topics are not yet supported by tiered storage.",
            evidenceRecordIds: ["kip-405:wiki"],
          },
        ],
      },
    });

    expect(detail.keyPoints.status).toBe("generated");
  });

  test("rejects a key point that cites evidence outside this detail", () => {
    expect(() =>
      buildFeedDetail({
        entry,
        records,
        keyPoints: {
          status: "generated",
          derivation: { kind: "model", provider: "local", model: "small-model", promptRevision: "key-points@1" },
          points: [
            {
              id: "point:uncited",
              text: "Unsupported claim",
              evidenceRecordIds: ["kip-1150:wiki"],
            },
          ],
        },
      }),
    ).toThrow("key points must only cite contained records");
  });
});
