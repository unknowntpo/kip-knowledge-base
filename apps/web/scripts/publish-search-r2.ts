import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  buildR2SearchProjection,
  materializeSearchPublicationFromFeed,
  SEARCH_CURRENT_KEY,
} from "@oss-knowledge-base/serving-contract";

import { buildGoldenSearchPublication } from "./build-search-fixture";
import { loadRecordedFeedPublication } from "./load-recorded-feed-publication";

const bucket = Bun.env.R2_BUCKET ?? "oss-knowledge-base-poc";
const remote = Bun.argv.includes("--remote");
const golden = Bun.argv.includes("--source=golden");
const confirmation = Bun.env.CONFIRM_PUBLIC_SEARCH_PUBLISH;
const fixturePath = new URL(
  "../../../packages/search/test/fixtures/golden-queries.v1.json",
  import.meta.url,
).pathname;
const recorded = golden ? undefined : await loadRecordedFeedPublication();
const indexRevision = golden
  ? `poc-${new Date().toISOString().replace(/[:.]/gu, "-")}`
  : `feed-${recorded!.releaseId}`;
const publication = golden
  ? await buildGoldenSearchPublication(fixturePath, indexRevision)
  : await materializeSearchPublicationFromFeed({
    feed: recorded!.publication,
    indexRevision,
    corpusRevision: `feed:${recorded!.releaseId}`,
    generatedAt: recorded!.publication.index.generatedAt,
  });
const objects = await buildR2SearchProjection(
  publication,
);
const immutable = objects.filter((object) => object.key !== SEARCH_CURRENT_KEY);
const current = objects.find((object) => object.key === SEARCH_CURRENT_KEY);

if (current === undefined) throw new Error("Search publication has no current pointer");
const writeSafetyCap = golden ? 25 : 250;
if (objects.length > writeSafetyCap) {
  throw new Error(`Search publication exceeds the ${writeSafetyCap}-write safety cap: ${objects.length}`);
}

const encoder = new TextEncoder();
const objectSizes = objects.map((object) => ({
  key: object.key,
  bytes: encoder.encode(object.body).byteLength,
}));
const bytes = objectSizes.reduce((total, object) => total + object.bytes, 0);
const sourceRecordCount = golden
  ? undefined
  : recorded!.publication.details.reduce((total, detail) => total + detail.records.length, 0);
const plan = {
  mode: remote ? "remote" : "dry-run",
  source: golden ? "golden-query-fixture" : "recorded-feed-snapshot",
  bucket,
  indexRevision,
  ...(recorded === undefined ? {} : {
    feedReleaseId: recorded.releaseId,
    feedEntryCount: recorded.publication.index.entries.length,
    sourceRecordCount,
  }),
  shardCount: publication.shards.length,
  groupCount: publication.details.length,
  chunkCount: publication.shards.reduce((total, shard) => total + shard.chunks.length, 0),
  immutableObjectCount: immutable.length,
  totalObjectCount: objects.length,
  totalBytes: bytes,
  largestObjectBytes: Math.max(...objectSizes.map((object) => object.bytes)),
  pointerWrittenLast: current.key === SEARCH_CURRENT_KEY,
} as const;

if (!remote) {
  console.log(JSON.stringify(plan, null, 2));
  process.exit(0);
}
if (confirmation !== bucket) {
  throw new Error(`Set CONFIRM_PUBLIC_SEARCH_PUBLISH=${bucket} to publish remotely`);
}

const work = await mkdtemp(join(tmpdir(), "osskb-search-publish-"));
try {
  for (let offset = 0; offset < immutable.length; offset += 4) {
    await Promise.all(immutable.slice(offset, offset + 4).map((object) => putObject(work, object)));
  }
  await putObject(work, current);
  console.log(JSON.stringify({ ...plan, published: true }, null, 2));
} finally {
  await rm(work, { recursive: true, force: true });
}

async function putObject(
  work: string,
  object: { readonly key: string; readonly body: string },
): Promise<void> {
  const file = join(work, `${crypto.randomUUID()}.json`);
  await Bun.write(file, object.body);
  const child = Bun.spawn([
    "bunx",
    "wrangler",
    "r2",
    "object",
    "put",
    `${bucket}/${object.key}`,
    "--file",
    file,
    "--content-type",
    "application/json",
    "--remote",
  ], {
    cwd: new URL("..", import.meta.url).pathname,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (exitCode !== 0) {
    throw new Error(`Unable to publish ${object.key}: ${stderr || stdout}`);
  }
}
