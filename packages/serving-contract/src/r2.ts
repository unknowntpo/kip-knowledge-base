import type { FeedManifest, FeedPublication } from "./index";

export const MANIFEST_KEY = "public/v2/current.json";

export interface ProjectionObject {
  readonly key: string;
  readonly body: string;
  readonly cacheControl: string;
}

/** Safe for R2 object paths and Wrangler CLI; `_3A` is not URL-decoded in transit. */
export function feedEntryObjectName(feedEntryId: string): string {
  return encodeURIComponent(feedEntryId).replaceAll("%", "_");
}

export function buildR2Projection(
  publication: FeedPublication,
  releaseId: string,
): readonly ProjectionObject[] {
  const indexIds = new Set(publication.index.entries.map((item) => item.entry.id));
  const detailIds = new Set(publication.details.map((item) => item.entry.id));
  const missingDetails = [...indexIds].filter((id) => !detailIds.has(id));
  const orphanDetails = [...detailIds].filter((id) => !indexIds.has(id));
  if (missingDetails.length > 0 || orphanDetails.length > 0) {
    throw new Error(
      `Feed publication membership mismatch: missing details [${missingDetails.join(", ")}], orphan details [${orphanDetails.join(", ")}]`,
    );
  }

  const prefix = `public/v2/releases/${releaseId}`;
  const detailPrefix = `${prefix}/details/`;
  const feedIndexKey = `${prefix}/feed/index.json`;
  const details = publication.details.map((detail) => ({
    key: `${detailPrefix}${feedEntryObjectName(detail.entry.id)}.json`,
    body: JSON.stringify(detail),
    cacheControl: "public, max-age=31536000, immutable",
  }));
  const manifest: FeedManifest = {
    schema: "osskb.feed-manifest.v2",
    releaseId,
    generatedAt: publication.index.generatedAt,
    feedIndexKey,
    detailPrefix,
    entryCount: publication.index.entries.length,
  };

  return [
    {
      key: feedIndexKey,
      body: JSON.stringify(publication.index),
      cacheControl: "public, max-age=31536000, immutable",
    },
    ...details,
    {
      key: MANIFEST_KEY,
      body: JSON.stringify(manifest),
      cacheControl: "public, max-age=30, must-revalidate",
    },
  ];
}

export function isFeedManifest(value: unknown): value is FeedManifest {
  if (value === null || typeof value !== "object") return false;
  const manifest = value as Partial<FeedManifest>;
  return manifest.schema === "osskb.feed-manifest.v2"
    && typeof manifest.releaseId === "string"
    && typeof manifest.generatedAt === "string"
    && typeof manifest.feedIndexKey === "string"
    && typeof manifest.detailPrefix === "string"
    && typeof manifest.entryCount === "number";
}
