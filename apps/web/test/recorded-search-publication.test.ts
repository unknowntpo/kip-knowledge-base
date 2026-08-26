import { describe, expect, test } from "bun:test";

import { buildLexicalIndex, searchLexicalIndex } from "@oss-knowledge-base/search";
import { materializeSearchPublicationFromFeed } from "@oss-knowledge-base/serving-contract";

import { loadRecordedFeedPublication } from "../scripts/load-recorded-feed-publication";

describe("recorded Feed snapshot Search publication", () => {
  test("indexes every accepted group and SourceRecord and retrieves both projects", async () => {
    const recorded = await loadRecordedFeedPublication();
    const publication = await materializeSearchPublicationFromFeed({
      feed: recorded.publication,
      indexRevision: `feed-${recorded.releaseId}`,
      corpusRevision: `feed:${recorded.releaseId}`,
      generatedAt: recorded.publication.index.generatedAt,
    });
    const chunks = publication.shards.flatMap((shard) => shard.chunks);

    expect(publication.details).toHaveLength(184);
    expect(chunks).toHaveLength(353);
    expect(new Set(chunks.map((chunk) => chunk.recordId)).size).toBe(353);

    const index = buildLexicalIndex({
      indexRevision: publication.indexRevision,
      chunks,
    });
    expect(searchLexicalIndex(index, { query: "KAFKA-20983", limit: 1 })[0]).toMatchObject({
      groupRootRecordId: "kafka:github:pull:23265",
      projectId: "apache-kafka",
      exactMatch: true,
    });
    expect(searchLexicalIndex(index, { query: "Dictionary Encoding", limit: 1 })[0]).toMatchObject({
      groupRootRecordId: "datafusion:github:issue:24111",
      projectId: "apache-datafusion",
    });
  });
});
