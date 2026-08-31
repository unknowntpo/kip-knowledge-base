import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { canonicalDigest, verifyReferenceParity } from "../src";

const oraclePath = join(import.meta.dir, "fixtures", "github-feed-projection.v1.json");

describe("Fluss/Flink reference parity gate", () => {
  test("accepts an independently loaded byte-equivalent candidate", async () => {
    const oracle = await Bun.file(oraclePath).json();
    const candidate = JSON.parse(JSON.stringify(oracle));

    expect(verifyReferenceParity(candidate, oracle)).toBe(oracle.digest);
  });

  test("rejects a self-consistent candidate that differs from the oracle", async () => {
    const oracle = await Bun.file(oraclePath).json() as any;
    const candidate = JSON.parse(JSON.stringify(oracle));
    candidate.publication.index.entries[0].entry.summary = "different materialized output";
    candidate.digest = canonicalDigest(candidate.publication);

    expect(() => verifyReferenceParity(candidate, oracle)).toThrow("does not match oracle");
  });
});
