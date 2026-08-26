import { describe, expect, test } from "bun:test";

import { chunkSourceRecord, type IndexableSourceRecordV1 } from "../src";

function record(sourceVersion = "version-1"): IndexableSourceRecordV1 {
  return {
    projectId: "apache-kafka",
    sourceInstanceId: "apache-kafka-github",
    recordId: "kafka:github:issue:1",
    groupRootRecordId: "kafka:github:issue:1",
    title: "Deterministic chunks",
    canonicalUrl: "https://github.com/apache/kafka/issues/1",
    author: "contributor",
    occurredAt: "2026-08-25T00:00:00Z",
    sourceVersion,
    tags: ["search"],
    parts: [
      { key: "body", title: "Description", text: "one two three four five six seven" },
      { key: "comment:1", text: "eight nine" },
    ],
  };
}

describe("deterministic source chunking", () => {
  test("keeps structural parts separate and overlaps only oversized parts", async () => {
    const chunks = await chunkSourceRecord(record(), {
      revision: "fixture-chunker@1",
      maximumWords: 4,
      overlapWords: 1,
    });

    expect(chunks.map((chunk) => chunk.text)).toEqual([
      "one two three four",
      "four five six seven",
      "eight nine",
    ]);
    expect(chunks.map((chunk) => chunk.ordinal)).toEqual([0, 1, 2]);
    expect(chunks[0]?.title).toBe("Deterministic chunks — Description");
  });

  test("replays identical IDs and hashes for the same source version", async () => {
    expect(await chunkSourceRecord(record())).toEqual(await chunkSourceRecord(record()));
  });

  test("changes chunk identity when the source version changes", async () => {
    const first = await chunkSourceRecord(record("version-1"));
    const second = await chunkSourceRecord(record("version-2"));

    expect(second.map((chunk) => chunk.id)).not.toEqual(first.map((chunk) => chunk.id));
    expect(second.map((chunk) => chunk.contentHash)).toEqual(
      first.map((chunk) => chunk.contentHash),
    );
  });

  test("rejects a record with no indexable text", async () => {
    await expect(chunkSourceRecord({ ...record(), parts: [{ key: "body", text: "  " }] }))
      .rejects.toThrow("has no indexable text");
  });
});
