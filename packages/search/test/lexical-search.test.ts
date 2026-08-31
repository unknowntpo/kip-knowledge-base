import { describe, expect, test } from "bun:test";

import {
  buildLexicalIndex,
  facetLexicalIndexByProject,
  parseSearchGoldenFixture,
  searchLexicalIndex,
  tokenizeLexical,
} from "../src";

const fixturePath = new URL("./fixtures/golden-queries.v1.json", import.meta.url);

async function fixture() {
  return parseSearchGoldenFixture(await Bun.file(fixturePath).json());
}

describe("Phase 1 deterministic lexical search", () => {
  test("preserves project identifiers and punctuation-bearing code symbols", () => {
    expect(tokenizeLexical("KAFKA-20983 RecordAccumulator.ready()"))
      .toEqual([
        "kafka-20983",
        "kafka",
        "20983",
        "recordaccumulator.ready()",
        "recordaccumulator",
        "ready",
      ]);
  });

  test("passes every Phase 1 golden-query grade", async () => {
    const golden = await fixture();
    const index = buildLexicalIndex({
      indexRevision: golden.indexRevision,
      chunks: golden.chunks,
    });

    for (const query of golden.queries.filter((candidate) => candidate.minimumPhase === 1)) {
      const results = searchLexicalIndex(index, {
        ...query.request,
        limit: query.expectation.topK,
      });
      const roots = results.map((result) => result.groupRootRecordId);
      const evidence = new Set(
        results.flatMap((result) => result.matches.map((match) => match.recordId)),
      );

      for (const required of query.expectation.requiredGroupRootRecordIds) {
        expect(roots, `${query.id}: required group ${required}`).toContain(required);
      }
      for (const forbidden of query.expectation.forbiddenGroupRootRecordIds) {
        expect(roots, `${query.id}: forbidden group ${forbidden}`).not.toContain(forbidden);
      }
      for (const required of query.expectation.requiredEvidenceRecordIds) {
        expect(evidence.has(required), `${query.id}: required evidence ${required}`).toBeTrue();
      }
    }
  });

  test("is independent of input order and deduplicates identical chunks", async () => {
    const golden = await fixture();
    const forward = buildLexicalIndex({
      indexRevision: golden.indexRevision,
      chunks: golden.chunks,
    });
    const reversed = buildLexicalIndex({
      indexRevision: golden.indexRevision,
      chunks: [...golden.chunks, golden.chunks[0]!].reverse(),
    });
    const request = { query: "remote storage fetch latency compacted topics", limit: 3 };

    expect(searchLexicalIndex(reversed, request)).toEqual(
      searchLexicalIndex(forward, request),
    );
  });

  test("applies project filters before ranking", async () => {
    const golden = await fixture();
    const index = buildLexicalIndex({
      indexRevision: golden.indexRevision,
      chunks: golden.chunks,
    });
    const results = searchLexicalIndex(index, {
      query: "issue 20983",
      filters: { projectIds: ["apache-datafusion"] },
      limit: 10,
    });

    expect(results[0]?.groupRootRecordId).toBe("datafusion:github:issue:20983");
    expect(results.every((result) => result.projectId === "apache-datafusion"))
      .toBeTrue();
  });

  test("facets every matching group before project filtering and limiting", async () => {
    const golden = await fixture();
    const index = buildLexicalIndex({
      indexRevision: golden.indexRevision,
      chunks: golden.chunks,
    });
    const request = {
      query: "issue 20983",
      filters: { projectIds: ["apache-datafusion"] },
    } as const;

    expect(searchLexicalIndex(index, { ...request, limit: 1 })).toHaveLength(1);
    expect(facetLexicalIndexByProject(index, request)).toEqual({
      "apache-datafusion": 2,
      "apache-kafka": 2,
    });
  });

  test("applies strict evidence timestamp bounds before grouping and ranking", async () => {
    const golden = await fixture();
    const index = buildLexicalIndex({
      indexRevision: golden.indexRevision,
      chunks: golden.chunks,
    });
    const results = searchLexicalIndex(index, {
      query: "remote storage",
      filters: {
        projectIds: ["apache-kafka"],
        occurredAfter: "2025-01-01T00:00:00Z",
        occurredBefore: "2026-08-01T00:00:00Z",
      },
      limit: 10,
    });

    expect(results.map((result) => result.groupRootRecordId))
      .toEqual(["kafka:wiki:kip-405"]);
    expect(results.flatMap((result) => result.matches).every((match) =>
      match.occurredAt > "2025-01-01T00:00:00Z" &&
      match.occurredAt < "2026-08-01T00:00:00Z"))
      .toBeTrue();
  });

  test("rejects invalid time ranges and unscoped project statuses", async () => {
    const golden = await fixture();
    const index = buildLexicalIndex({
      indexRevision: golden.indexRevision,
      chunks: golden.chunks,
    });

    expect(() => searchLexicalIndex(index, {
      query: "storage",
      filters: {
        occurredAfter: "2026-08-01T00:00:00Z",
        occurredBefore: "2026-08-01T00:00:00Z",
      },
    })).toThrow("occurredAfter must be earlier than occurredBefore");
    expect(() => searchLexicalIndex(index, {
      query: "storage",
      filters: { projectStatuses: ["merged"] },
    })).toThrow("projectStatuses requires exactly one projectId");
  });

  test("rejects conflicting duplicate chunk identities", async () => {
    const golden = await fixture();
    const original = golden.chunks[0]!;
    const conflicting = { ...original, contentHash: `sha256:${"a".repeat(64)}` };

    expect(() => buildLexicalIndex({
      indexRevision: golden.indexRevision,
      chunks: [original, conflicting],
    })).toThrow(`Conflicting chunks share id ${original.id}`);
  });
});
