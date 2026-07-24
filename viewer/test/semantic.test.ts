import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseVault } from "../scripts/parse-vault";
import { buildCorpus, corpusHash } from "../../tools/semantic/corpus";

const url = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const readJson = (p: string) => JSON.parse(readFileSync(url(p), "utf8"));

const embeddings = readJson("../../tools/semantic/embeddings.json");
const related = readJson("../../tools/semantic/related.json");
const golden = readJson("../../tools/semantic/golden-embeddings.json");

const parsedVault = parseVault(url("../../vault/KIPs"));
const vaultIds = new Set<string>(parsedVault.map((k: any) => k.id));

// vectors are L2-normalized, so cosine similarity == dot product.
const dot = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0);

// "Pending regeneration" allowance (spec §6): after the corpus backfill imports
// stub notes, the committed embeddings are intentionally stale until the
// orchestrator runs `bun run embeddings`. When BACKFILL_WIP=1 AND the vault
// contains stub notes AND the corpusHash has drifted, SKIP the staleness +
// golden suites (they depend on regenerated vectors). Defaults to strict: with a
// stub-free vault, or without the env flag, every assertion runs as before.
const hasStubs = parsedVault.some((k: any) => k.stub === true);
const hashMismatch = corpusHash(buildCorpus()) !== embeddings.corpusHash;
const pendingRegen = process.env.BACKFILL_WIP === "1" && hasStubs && hashMismatch;
if (pendingRegen)
  console.warn(
    "[semantic] BACKFILL_WIP=1 + stub notes + corpusHash drift: skipping staleness/golden " +
      "suites until `cd viewer && bun run embeddings` regenerates the vectors."
  );
const strictIt = pendingRegen ? it.skip : it;

describe("semantic: staleness guard", () => {
  strictIt("embeddings.json.corpusHash matches the current vault corpus", () => {
    const hash = corpusHash(buildCorpus());
    expect(
      hash,
      `corpusHash mismatch: the vault changed since embeddings were built. ` +
        `Regenerate with: cd viewer && npm run embeddings`
    ).toBe(embeddings.corpusHash);
  });
});

describe("semantic: golden queries", () => {
  const docIds = Object.keys(embeddings.vectors);
  for (const { q, expect: want, vector } of golden.queries) {
    strictIt(`retrieves an expected KIP in top-3 for: "${q}"`, () => {
      const ranked = docIds
        .map((id) => ({ id, score: dot(vector, embeddings.vectors[id]) }))
        .sort((a, b) => b.score - a.score);
      const top3 = ranked.slice(0, 3).map((r) => r.id);
      const hit = want.some((id: string) => top3.includes(id));
      expect(
        hit,
        `query "${q}" expected one of ${JSON.stringify(want)} in top-3, got ${JSON.stringify(top3)}`
      ).toBe(true);
    });
  }
});

describe("semantic: related.json consistency", () => {
  it("every referenced id exists in the vault, with no self-reference", () => {
    for (const [id, neighbors] of Object.entries<any[]>(related)) {
      expect(vaultIds.has(id), `related.json key ${id} not in vault`).toBe(true);
      for (const n of neighbors) {
        expect(vaultIds.has(n.id), `${id} -> ${n.id} not in vault`).toBe(true);
        expect(n.id, `${id} references itself`).not.toBe(id);
      }
    }
  });

  it("has at most 3 neighbors per KIP, scores descending in (0, 1]", () => {
    for (const [id, neighbors] of Object.entries<any[]>(related)) {
      expect(neighbors.length, `${id} has more than 3 neighbors`).toBeLessThanOrEqual(3);
      for (let i = 0; i < neighbors.length; i++) {
        const s = neighbors[i].score;
        expect(s, `${id} -> ${neighbors[i].id} score out of (0, 1]`).toBeGreaterThan(0);
        expect(s, `${id} -> ${neighbors[i].id} score out of (0, 1]`).toBeLessThanOrEqual(1);
        if (i > 0)
          expect(s, `${id} neighbors not sorted descending`).toBeLessThanOrEqual(
            neighbors[i - 1].score
          );
      }
    }
  });
});

describe("semantic: model/dim consistency", () => {
  it("embeddings.json and golden-embeddings.json agree on model + dim", () => {
    expect(golden.model).toBe(embeddings.model);
    expect(golden.dim).toBe(embeddings.dim);
    for (const id of Object.keys(embeddings.vectors))
      expect(embeddings.vectors[id].length).toBe(embeddings.dim);
    for (const q of golden.queries) expect(q.vector.length).toBe(golden.dim);
  });
});
