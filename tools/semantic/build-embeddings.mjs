// Build the semantic layer artifacts from the vault.
//
//   cd viewer && npm run embeddings
//
// Resolves @xenova/transformers from viewer/node_modules (run with cwd=viewer),
// embeds every KIP document and every golden query with Xenova/e5-small-v2
// (quantized, mean-pooled + L2-normalized), and writes three committed JSON files:
//   embeddings.json        doc vectors + corpusHash (staleness guard)
//   related.json           top-3 semantic neighbors per KIP (drives "Similar KIPs")
//   golden-embeddings.json golden-query vectors (regression harness input)
//
// e5 is asymmetric: documents are embedded as "passage: <text>", queries as
// "query: <text>". Floats are rounded so the committed JSON is stable across runs.
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCorpus, corpusHash } from "./corpus.mjs";

const here = dirname(fileURLToPath(import.meta.url));
// Resolve the dep from the viewer workspace (its devDependency), regardless of cwd.
const require = createRequire(resolve(here, "../../viewer/package.json"));
const { pipeline } = await import(require.resolve("@xenova/transformers"));

const MODEL = "Xenova/e5-small-v2";
const DIM = 384;
const round = (x, dp) => Number(x.toFixed(dp));

const extractor = await pipeline("feature-extraction", MODEL, { quantized: true });

// Embed one text -> plain number[] (mean pooling + L2 normalize, e5 convention).
async function embed(text) {
  const out = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(out.data);
}

// cosine === dot product because vectors are already L2-normalized.
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);

async function main() {
  const corpus = buildCorpus(); // [{ id, text }], ascending by KIP number
  const hash = corpusHash(corpus);

  // --- document vectors ---
  const vectors = {};
  const rawVectors = {}; // full-precision, for neighbor scoring
  for (const { id, text } of corpus) {
    const v = await embed(`passage: ${text}`);
    rawVectors[id] = v;
    vectors[id] = v.map((x) => round(x, 6));
    console.log(`embedded ${id}`);
  }

  writeFileSync(
    resolve(here, "embeddings.json"),
    JSON.stringify({ model: MODEL, dim: DIM, corpusHash: hash, vectors }, null, 2) + "\n"
  );

  // --- related.json: top-3 neighbors per KIP, excluding self ---
  const ids = corpus.map((c) => c.id);
  const related = {};
  for (const id of ids) {
    related[id] = ids
      .filter((o) => o !== id)
      .map((o) => ({ id: o, score: round(dot(rawVectors[id], rawVectors[o]), 4) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }
  writeFileSync(resolve(here, "related.json"), JSON.stringify(related, null, 2) + "\n");

  // --- golden-embeddings.json: each golden query embedded with the query prefix ---
  const golden = JSON.parse(readFileSync(resolve(here, "golden-queries.json"), "utf8"));
  const queries = [];
  for (const { q, expect } of golden.queries) {
    const v = await embed(`query: ${q}`);
    queries.push({ q, expect, vector: v.map((x) => round(x, 6)) });
    console.log(`embedded query: ${q}`);
  }
  writeFileSync(
    resolve(here, "golden-embeddings.json"),
    JSON.stringify({ model: MODEL, dim: DIM, queries }, null, 2) + "\n"
  );

  console.log(
    `\nbuild-embeddings: ${ids.length} docs, ${queries.length} golden queries, corpusHash ${hash.slice(0, 12)}…`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
