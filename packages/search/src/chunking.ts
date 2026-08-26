import {
  SOURCE_RECORD_CHUNK_SCHEMA,
  type SourceRecordChunkV1,
} from "./golden-fixture";

export const DEFAULT_CHUNKING_REVISION = "source-structure-window@1";

export interface IndexableSourcePartV1 {
  /** Stable within this source version, for example `body` or `comment:123`. */
  readonly key: string;
  readonly title?: string;
  readonly text: string;
}

export interface IndexableSourceRecordV1 {
  readonly projectId: string;
  readonly sourceInstanceId: string;
  readonly recordId: string;
  readonly groupRootRecordId: string;
  readonly title: string;
  readonly canonicalUrl: string;
  readonly author: string;
  readonly occurredAt: string;
  readonly sourceVersion: string;
  readonly tags: readonly string[];
  readonly parts: readonly IndexableSourcePartV1[];
}

export interface ChunkingPolicyV1 {
  readonly revision: string;
  readonly maximumWords: number;
  readonly overlapWords: number;
}

export const defaultChunkingPolicy: ChunkingPolicyV1 = {
  revision: DEFAULT_CHUNKING_REVISION,
  maximumWords: 180,
  overlapWords: 30,
};

/**
 * Structural parts never cross each other. Oversized parts use deterministic
 * word windows with bounded overlap.
 */
export async function chunkSourceRecord(
  record: IndexableSourceRecordV1,
  policy: ChunkingPolicyV1 = defaultChunkingPolicy,
): Promise<readonly SourceRecordChunkV1[]> {
  validatePolicy(policy);
  if (record.parts.length === 0) {
    throw new Error(`Source record ${record.recordId} has no indexable parts`);
  }

  const drafts: Array<{
    readonly part: IndexableSourcePartV1;
    readonly text: string;
  }> = [];
  const advance = policy.maximumWords - policy.overlapWords;
  for (const part of record.parts) {
    requireText(part.key, "part.key");
    const words = part.text.trim().match(/\S+/gu) ?? [];
    if (words.length === 0) continue;
    for (let start = 0; start < words.length; start += advance) {
      drafts.push({ part, text: words.slice(start, start + policy.maximumWords).join(" ") });
      if (start + policy.maximumWords >= words.length) break;
    }
  }
  if (drafts.length === 0) {
    throw new Error(`Source record ${record.recordId} has no indexable text`);
  }

  return Promise.all(drafts.map(async (draft, ordinal) => {
    const contentDigest = await sha256(draft.text);
    const identityDigest = await sha256([
      record.recordId,
      record.sourceVersion,
      draft.part.key,
      ordinal,
      contentDigest,
      policy.revision,
    ].join("\u0000"));
    return {
      schema: SOURCE_RECORD_CHUNK_SCHEMA,
      id: `chunk:sha256:${identityDigest}`,
      projectId: requireText(record.projectId, "projectId"),
      sourceInstanceId: requireText(record.sourceInstanceId, "sourceInstanceId"),
      recordId: requireText(record.recordId, "recordId"),
      groupRootRecordId: requireText(record.groupRootRecordId, "groupRootRecordId"),
      ordinal,
      title: draft.part.title === undefined
        ? requireText(record.title, "title")
        : `${requireText(record.title, "title")} — ${requireText(draft.part.title, "part.title")}`,
      text: draft.text,
      canonicalUrl: requireHttps(record.canonicalUrl),
      author: requireText(record.author, "author"),
      occurredAt: requireTimestamp(record.occurredAt),
      sourceVersion: requireText(record.sourceVersion, "sourceVersion"),
      tags: [...record.tags],
      contentHash: `sha256:${contentDigest}`,
    } satisfies SourceRecordChunkV1;
  }));
}

function validatePolicy(policy: ChunkingPolicyV1): void {
  requireText(policy.revision, "policy.revision");
  if (!Number.isInteger(policy.maximumWords) || policy.maximumWords < 2) {
    throw new Error("maximumWords must be an integer of at least 2");
  }
  if (
    !Number.isInteger(policy.overlapWords) ||
    policy.overlapWords < 0 ||
    policy.overlapWords >= policy.maximumWords
  ) {
    throw new Error("overlapWords must be an integer smaller than maximumWords");
  }
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function requireHttps(value: string): string {
  const result = requireText(value, "canonicalUrl");
  if (!result.startsWith("https://")) throw new Error("canonicalUrl must use https");
  return result;
}

function requireTimestamp(value: string): string {
  const result = requireText(value, "occurredAt");
  if (Number.isNaN(Date.parse(result))) throw new Error("occurredAt must be an ISO timestamp");
  return result;
}

function requireText(value: string, label: string): string {
  const result = value.trim();
  if (result.length === 0) throw new Error(`${label} must not be empty`);
  return result;
}
