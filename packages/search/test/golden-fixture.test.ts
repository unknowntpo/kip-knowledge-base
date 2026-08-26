import { describe, expect, test } from "bun:test";

import {
  GOLDEN_QUERY_CATEGORIES,
  parseSearchGoldenFixture,
} from "../src";

const fixturePath = new URL("./fixtures/golden-queries.v1.json", import.meta.url);

async function loadFixture(): Promise<unknown> {
  return Bun.file(fixturePath).json();
}

function clone(value: unknown): Record<string, unknown> {
  return structuredClone(value) as Record<string, unknown>;
}

describe("Spec 005 golden-query contract", () => {
  test("accepts the versioned Kafka/DataFusion fixture", async () => {
    const fixture = parseSearchGoldenFixture(await loadFixture());

    expect(fixture.schema).toBe("osskb.search-golden-fixture.v1");
    expect(new Set(fixture.chunks.map((chunk) => chunk.projectId))).toEqual(
      new Set(["apache-kafka", "apache-datafusion"]),
    );
    expect(fixture.queries.filter((query) => query.minimumPhase === 1).length).toBe(
      7,
    );
    expect(fixture.queries.filter((query) => query.minimumPhase === 2).length).toBe(
      1,
    );
    expect(new Set(fixture.queries.map((query) => query.category))).toEqual(
      new Set(GOLDEN_QUERY_CATEGORIES),
    );

    for (const chunk of fixture.chunks) {
      const digest = new Bun.CryptoHasher("sha256").update(chunk.text).digest("hex");
      expect(chunk.contentHash).toBe(`sha256:${digest}`);
    }
  });

  test("rejects an expectation that cites a missing record", async () => {
    const input = clone(await loadFixture());
    const queries = input.queries as Array<Record<string, unknown>>;
    const expectation = queries[0]?.expectation as Record<string, unknown>;
    expectation.requiredEvidenceRecordIds = ["missing:record"];

    expect(() => parseSearchGoldenFixture(input)).toThrow(
      "references missing record missing:record",
    );
  });

  test("rejects contradictory direct and forbidden grades", async () => {
    const input = clone(await loadFixture());
    const queries = input.queries as Array<Record<string, unknown>>;
    const expectation = queries[0]?.expectation as Record<string, unknown>;
    expectation.forbiddenGroupRootRecordIds = ["kafka:github:issue:20983"];

    expect(() => parseSearchGoldenFixture(input)).toThrow(
      "duplicate value kafka:github:issue:20983",
    );
  });

  test("rejects a child whose group root is absent from the corpus", async () => {
    const input = clone(await loadFixture());
    const chunks = input.chunks as Array<Record<string, unknown>>;
    chunks[5]!.groupRootRecordId = "kafka:wiki:missing-kip";

    expect(() => parseSearchGoldenFixture(input)).toThrow(
      "references missing record kafka:wiki:missing-kip",
    );
  });

  test("keeps vocabulary-gap evaluation outside the Phase 1 gate", async () => {
    const fixture = parseSearchGoldenFixture(await loadFixture());
    const phaseOneIds = fixture.queries
      .filter((query) => query.minimumPhase <= 1)
      .map((query) => query.id);

    expect(phaseOneIds).not.toContain("vocabulary-gap-cold-data");
    expect(phaseOneIds).toContain("exact-kafka-issue-id");
  });
});
