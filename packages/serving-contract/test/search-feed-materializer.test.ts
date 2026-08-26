import { describe, expect, test } from "bun:test";

import {
  buildFeedDetail,
  type FeedDetail,
  type FeedEntry,
  type SourceRecordView,
} from "@oss-knowledge-base/domain";

import {
  buildR2SearchProjection,
  materializeSearchPublicationFromFeed,
  type FeedIndexEntry,
  type FeedPublication,
} from "../src";

const revisions = {
  indexRevision: "feed-release-1",
  corpusRevision: "feed:release-1",
  generatedAt: "2026-08-25T08:29:41.122Z",
} as const;

describe("completed Feed snapshot Search materializer", () => {
  test("materializes every group and SourceRecord with traceable metadata", async () => {
    const result = await materializeSearchPublicationFromFeed({ feed: fixture(), ...revisions });

    expect(result.shards.map((shard) => shard.projectId)).toEqual([
      "apache-datafusion",
      "apache-kafka",
    ]);
    expect(result.shards.reduce((total, shard) => total + shard.groups.length, 0)).toBe(2);
    expect(result.shards.reduce((total, shard) => total + shard.chunks.length, 0)).toBe(3);
    expect(result.details).toHaveLength(2);

    const kafka = result.shards.find((shard) => shard.projectId === "apache-kafka")!;
    expect(kafka.chunks.every((chunk) => chunk.groupRootRecordId === "kafka:github:issue:1"))
      .toBe(true);
    expect(kafka.chunks.every((chunk) => chunk.tags.includes("consumer"))).toBe(true);
    expect(kafka.chunks.find((chunk) => chunk.recordId.endsWith("comment:10"))?.author)
      .toBe("reviewer");

    const objects = await buildR2SearchProjection(result);
    const kafkaShard = JSON.parse(objects.find((object) =>
      object.key.endsWith("lexical/apache-kafka.json"))!.body) as {
      readonly groups: readonly { readonly projectStatus?: string }[];
    };
    expect(kafkaShard.groups[0]?.projectStatus).toBe("open");
  });

  test("produces byte-identical R2 objects after harmless input shuffling", async () => {
    const original = fixture();
    const shuffled: FeedPublication = {
      index: {
        ...original.index,
        entries: [...original.index.entries].reverse().map((item) => ({
          ...item,
          tags: [...item.tags].reverse(),
        })),
      },
      details: [...original.details].reverse().map((detail) => ({
        ...detail,
        records: [...detail.records].reverse(),
        connections: [...detail.connections].reverse(),
      })),
    };
    const left = await buildR2SearchProjection(
      await materializeSearchPublicationFromFeed({ feed: original, ...revisions }),
    );
    const right = await buildR2SearchProjection(
      await materializeSearchPublicationFromFeed({ feed: shuffled, ...revisions }),
    );

    expect(left).toEqual(right);
  });

  test("rejects one SourceRecord reused by two accepted groups", async () => {
    const feed = fixture();
    const [kafka, datafusion] = feed.details;
    const reused = {
      ...kafka!.records[1]!,
      projectId: datafusion!.entry.projectId,
    };
    const invalidDetail: FeedDetail = {
      ...datafusion!,
      entry: {
        ...datafusion!.entry,
        recordIds: [...datafusion!.entry.recordIds, reused.id],
      },
      records: [...datafusion!.records, reused],
    };
    const invalidIndexEntry = {
      ...feed.index.entries[1]!,
      entry: invalidDetail.entry,
    };

    await expect(materializeSearchPublicationFromFeed({
      feed: {
        index: { ...feed.index, entries: [feed.index.entries[0]!, invalidIndexEntry] },
        details: [kafka!, invalidDetail],
      },
      ...revisions,
    })).rejects.toThrow("belongs to both");
  });
});

function fixture(): FeedPublication {
  const kafkaRoot = record({
    id: "kafka:github:issue:1",
    projectId: "apache-kafka",
    title: "KAFKA-1: Consumer coordination",
    excerpt: "Consumer group coordination and rebalance behavior.",
    author: "author",
    occurredAt: "2026-08-24T10:00:00Z",
    artifactStatus: "open",
  });
  const kafkaComment = record({
    id: "kafka:github:issue:1:comment:10",
    projectId: "apache-kafka",
    title: "Comment on KAFKA-1",
    excerpt: "The reviewer asks how static membership affects the coordinator.",
    author: "reviewer",
    occurredAt: "2026-08-25T10:00:00Z",
  });
  const datafusionRoot = record({
    id: "datafusion:github:pull:2",
    projectId: "apache-datafusion",
    title: "Improve parquet pruning",
    excerpt: "Adds statistics-aware pruning to the physical optimizer.",
    author: "datafusion-author",
    occurredAt: "2026-08-25T11:00:00Z",
    artifactStatus: "merged",
  });
  const kafkaEntry = entry(
    "feed-entry:kafka:1",
    "apache-kafka",
    kafkaRoot,
    [kafkaRoot.id, kafkaComment.id],
  );
  const datafusionEntry = entry(
    "feed-entry:datafusion:2",
    "apache-datafusion",
    datafusionRoot,
    [datafusionRoot.id],
  );
  const details = [
    buildFeedDetail({ entry: kafkaEntry, records: [kafkaRoot, kafkaComment] }),
    buildFeedDetail({ entry: datafusionEntry, records: [datafusionRoot] }),
  ];

  return {
    index: {
      schema: "osskb.feed-index.v2",
      generatedAt: revisions.generatedAt,
      sourceTypes: { github: { key: "github", label: "GitHub", full: "GitHub" } },
      projects: [],
      entries: [
        indexEntry("kafka", kafkaEntry, ["consumer", "coordination"]),
        indexEntry("datafusion", datafusionEntry, ["optimizer", "parquet"]),
      ],
      metadata: {},
    },
    details,
  };
}

function record(input: {
  readonly id: string;
  readonly projectId: string;
  readonly title: string;
  readonly excerpt: string;
  readonly author: string;
  readonly occurredAt: string;
  readonly artifactStatus?: string;
}): SourceRecordView {
  return {
    ...input,
    sourceInstanceId: `${input.projectId}:github`,
    source: "github",
    sourceType: "code-host",
    kind: "GitHub record",
    role: "Community contributor",
    canonicalUrl: `https://github.com/apache/example/${encodeURIComponent(input.id)}`,
    sourceVersion: `github:${input.id}:v1`,
  };
}

function entry(
  id: string,
  projectId: string,
  root: SourceRecordView,
  recordIds: readonly string[],
): FeedEntry {
  return {
    id,
    projectId,
    title: root.title,
    summary: root.excerpt,
    sourceTitleRecordId: root.id,
    recordIds,
    highlightedRecordIds: [root.id],
    reason: { kind: "trending", label: "fixture", evidenceEventIds: [] },
    activity: { score: recordIds.length, evidenceEventIds: [] },
    grouping: { relationshipIds: [], clusteringRevision: "fixture@1" },
  };
}

function indexEntry(
  projectKey: string,
  value: FeedEntry,
  tags: readonly string[],
): FeedIndexEntry {
  return {
    displayId: value.sourceTitleRecordId,
    projectKey,
    status: "open",
    releaseLabel: "GitHub",
    authors: [],
    tags,
    links: { github: "https://github.com/apache/example" },
    sourceCounts: { github: value.recordIds.length },
    lastActivityAt: revisions.generatedAt,
    searchText: "",
    entry: value,
  };
}
