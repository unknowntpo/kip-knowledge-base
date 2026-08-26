import { buildR2SearchProjection } from "@oss-knowledge-base/serving-contract";

import { searchR2Projection } from "../functions/_shared/search-projection";
import { buildGoldenSearchPublication } from "./build-search-fixture";

const fixturePath = new URL(
  "../../../packages/search/test/fixtures/golden-queries.v1.json",
  import.meta.url,
).pathname;
const iterations = 100;
const objects = await buildR2SearchProjection(
  await buildGoldenSearchPublication(fixturePath, "measurement-fixture-v1"),
);
const values = new Map(objects.map((object) => [object.key, object.body]));
const bucket = {
  get: async (key: string) => {
    const body = values.get(key);
    return body === undefined ? null : { json: async <T>() => JSON.parse(body) as T };
  },
} as unknown as R2Bucket;
const requests = [
  { query: "KIP-405", limit: 10 },
  { query: "RecordAccumulator.ready()", limit: 10 },
  {
    query: "producer",
    filters: { projectIds: ["apache-kafka"], projectStatuses: ["merged"] },
    limit: 10,
  },
] as const;

for (const request of requests) await searchR2Projection(bucket, request);

const samples: number[] = [];
for (let iteration = 0; iteration < iterations; iteration += 1) {
  const startedAt = performance.now();
  for (const request of requests) await searchR2Projection(bucket, request);
  samples.push((performance.now() - startedAt) / requests.length);
}
samples.sort((left, right) => left - right);

const bytes = objects.map((object) => new TextEncoder().encode(object.body).byteLength);
const lexicalBytes = objects
  .filter((object) => object.key.includes("/lexical/"))
  .map((object) => new TextEncoder().encode(object.body).byteLength);
const percentile = (value: number) => samples[Math.min(
  samples.length - 1,
  Math.ceil(samples.length * value) - 1,
)]!;

console.log(JSON.stringify({
  note: "In-memory R2 contract baseline; not a Cloudflare production SLA",
  iterations,
  queriesPerIteration: requests.length,
  releaseObjectCount: objects.length,
  releaseBytes: bytes.reduce((total, value) => total + value, 0),
  largestLexicalShardBytes: Math.max(...lexicalBytes),
  searchMilliseconds: {
    p50: Number(percentile(0.5).toFixed(3)),
    p95: Number(percentile(0.95).toFixed(3)),
    max: Number(samples.at(-1)!.toFixed(3)),
  },
}, null, 2));
