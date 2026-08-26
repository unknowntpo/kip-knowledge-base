import { join } from "node:path";

import { MANIFEST_KEY, type FeedManifest } from "@oss-knowledge-base/serving-contract";

const webRoot = join(import.meta.dir, "..", "..", "web");
const root = join(webRoot, "r2-seed");
const manifestPath = join(root, MANIFEST_KEY);
const manifest = await Bun.file(manifestPath).json() as FeedManifest;
if (manifest.schema !== "osskb.feed-manifest.v2") throw new Error("Invalid R2 manifest");

const keys: string[] = [];
for await (const file of new Bun.Glob(`public/v2/releases/${manifest.releaseId}/**/*.json`).scan({ cwd: root })) keys.push(file);
keys.sort();

const bucket = Bun.env.R2_BUCKET ?? "oss-knowledge-base-poc";
async function putObject(key: string): Promise<void> {
  const process = Bun.spawn([
    "bunx", "wrangler", "r2", "object", "put", `${bucket}/${key}`,
    "--file", join(root, key),
    "--content-type", "application/json",
    "--remote",
  ], { cwd: webRoot, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);
  if (code !== 0) throw new Error(`Unable to publish ${key}: ${stderr || stdout}`);
}

const concurrency = 8;
let cursor = 0;
await Promise.all(Array.from({ length: Math.min(concurrency, keys.length) }, async () => {
  for (;;) {
    const index = cursor++;
    const key = keys[index];
    if (key === undefined) return;
    await putObject(key);
  }
}));

// The only mutable object is deliberately outside the concurrent batch.
await putObject(MANIFEST_KEY);

console.log(`Published ${keys.length + 1} objects to R2 bucket ${bucket}; manifest was written last`);
