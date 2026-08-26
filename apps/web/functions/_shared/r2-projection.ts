import type { FeedDetail } from "@oss-knowledge-base/domain";
import {
  feedEntryObjectName,
  isFeedManifest,
  MANIFEST_KEY,
  type FeedIndex,
  type FeedManifest,
} from "@oss-knowledge-base/serving-contract";

export { buildR2Projection, feedEntryObjectName, MANIFEST_KEY } from "@oss-knowledge-base/serving-contract";

export async function readJsonObject<T>(bucket: R2Bucket, key: string): Promise<T | undefined> {
  const object = await bucket.get(key);
  if (object === null) return undefined;
  return object.json<T>();
}

export async function readManifest(bucket: R2Bucket): Promise<FeedManifest> {
  const value = await readJsonObject<unknown>(bucket, MANIFEST_KEY);
  if (!isFeedManifest(value)) throw new Error("R2 feed manifest is missing or invalid");
  return value;
}

export async function readFeedProjection(bucket: R2Bucket): Promise<FeedIndex> {
  const manifest = await readManifest(bucket);
  const feed = await readJsonObject<FeedIndex>(bucket, manifest.feedIndexKey);
  if (feed === undefined) throw new Error(`R2 feed index is missing for release ${manifest.releaseId}`);
  return {
    ...feed,
    metadata: { ...feed.metadata, servingMode: "cloudflare-pages-function-r2", manifest },
  };
}

export async function readDetailProjection(bucket: R2Bucket, feedEntryId: string): Promise<FeedDetail | undefined> {
  const manifest = await readManifest(bucket);
  return readJsonObject<FeedDetail>(bucket, `${manifest.detailPrefix}${feedEntryObjectName(feedEntryId)}.json`);
}

export function jsonResponse(value: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "public, max-age=30, stale-while-revalidate=120");
  headers.set("x-content-type-options", "nosniff");
  return new Response(JSON.stringify(value), { ...init, headers });
}
