import { describe, expect, test } from "bun:test";

import {
  buildR2Projection,
  MANIFEST_KEY,
  readDetailProjection,
  readFeedProjection,
} from "../functions/_shared/r2-projection";
import {
  buildR2SearchProjection,
  SEARCH_CURRENT_KEY,
  type FeedPublication,
} from "@oss-knowledge-base/serving-contract";
import {
  readSearchDetailProjection,
  searchR2Projection,
} from "../functions/_shared/search-projection";
import { buildGoldenSearchPublication } from "../scripts/build-search-fixture";

const searchFixturePath = new URL(
  "../../../packages/search/test/fixtures/golden-queries.v1.json",
  import.meta.url,
).pathname;

function fixture(): FeedPublication {
  const record = {
    id: "kafka:github:issue:1",
    projectId: "apache-kafka",
    sourceInstanceId: "kafka:github",
    source: "github",
    sourceType: "code-host",
    kind: "GitHub Issue",
    title: "Issue #1: Durable feed",
    excerpt: "Evidence",
    author: "contributor",
    role: "Contributor",
    occurredAt: "2026-08-21T00:00:00Z",
    canonicalUrl: "https://github.com/apache/kafka/issues/1",
    sourceVersion: "2026-08-21T00:00:00Z",
  } as const;
  const entry = {
    id: "feed-entry:kafka:1",
    projectId: "apache-kafka",
    title: "Durable feed",
    summary: "Evidence",
    sourceTitleRecordId: record.id,
    recordIds: [record.id],
    highlightedRecordIds: [record.id],
    reason: { kind: "trending", label: "1 event", evidenceEventIds: ["event:1"] },
    activity: { score: 1, evidenceEventIds: ["event:1"] },
    grouping: { relationshipIds: [], clusteringRevision: "fixture@1" },
  } as const;
  const detail = {
    entry,
    records: [record],
    connections: [],
    keyPoints: { status: "unavailable", reason: "generator-not-configured" },
  } as const;
  return {
    index: {
      schema: "osskb.feed-index.v2",
      generatedAt: "2026-08-21T01:00:00Z",
      sourceTypes: { github: { key: "github", label: "GitHub", full: "GitHub" } },
      projects: [{
        key: "kafka", label: "Apache Kafka", profileVersion: "kafka@1",
        statusPolicyRef: "github@1", statusFacetKey: "filter.status.github",
        sources: ["github"], statuses: [{ key: "open", label: "Open" }],
      }],
      entries: [{
        displayId: "KAFKA-ISSUE-1",
        projectKey: "kafka",
        status: "open",
        releaseLabel: "Issue #1",
        authors: ["contributor"],
        tags: ["Issue"],
        links: { github: record.canonicalUrl },
        sourceCounts: { github: 1 },
        lastActivityAt: record.occurredAt,
        searchText: "Durable feed Evidence contributor",
        entry,
      }],
      metadata: { source: "fixture" },
    },
    details: [detail],
  };
}

function memoryBucket(objects: readonly { readonly key: string; readonly body: string }[]): R2Bucket {
  const values = new Map(objects.map((object) => [object.key, object.body]));
  return {
    get: async (key: string) => {
      const body = values.get(key);
      return body === undefined ? null : { json: async <T>() => JSON.parse(body) as T };
    },
  } as unknown as R2Bucket;
}

describe("versioned R2 feed projection", () => {
  test("publishes immutable release objects before the mutable manifest", () => {
    const objects = buildR2Projection(fixture(), "release-1");
    expect(objects.at(-1)?.key).toBe(MANIFEST_KEY);
    expect(objects.filter((object) => object.key.includes("/details/"))).toHaveLength(1);
  });

  test("hydrates FeedIndex and FeedDetail through the current manifest", async () => {
    const objects = buildR2Projection(fixture(), "release-1");
    const bucket = memoryBucket(objects);
    const feed = await readFeedProjection(bucket);
    const detail = await readDetailProjection(bucket, "feed-entry:kafka:1");

    expect(feed.entries[0]?.entry.id).toBe("feed-entry:kafka:1");
    expect(feed.metadata.servingMode).toBe("cloudflare-pages-function-r2");
    expect(detail?.records[0]?.id).toBe("kafka:github:issue:1");
  });

  test("rejects a publication whose index and details disagree", () => {
    const publication = fixture();
    expect(() => buildR2Projection({ ...publication, details: [] }, "release-1"))
      .toThrow("membership mismatch");
  });

  test("fails closed when current manifest is missing", async () => {
    await expect(readFeedProjection(memoryBucket([]))).rejects.toThrow("manifest is missing or invalid");
  });
});

describe("versioned R2 Search projection", () => {
  test("publishes immutable shards and details before the mutable pointer", async () => {
    const objects = await buildR2SearchProjection(
      await buildGoldenSearchPublication(searchFixturePath),
    );

    expect(objects.at(-1)?.key).toBe(SEARCH_CURRENT_KEY);
    expect(objects.filter((object) => object.key.includes("/lexical/"))).toHaveLength(2);
    expect(objects.filter((object) => object.key.includes("/details/"))).not.toHaveLength(0);
  });

  test("searches evidence and hydrates the same FeedDetail contract", async () => {
    const objects = await buildR2SearchProjection(
      await buildGoldenSearchPublication(searchFixturePath),
    );
    const bucket = memoryBucket(objects);
    const response = await searchR2Projection(bucket, { query: "KIP-405", limit: 3 });

    expect(response.results[0]?.entry.sourceTitleRecordId).toBe("kafka:wiki:kip-405");
    expect(response.results[0]?.matches[0]?.canonicalUrl).toStartWith("https://");
    const detail = await readSearchDetailProjection(bucket, response.results[0]!.detailRef);
    expect(detail?.entry.reason.kind).toBe("search-match");
    expect(detail?.records.map((record) => record.id)).toContain("kafka:mail:kip-405-compaction");
  });

  test("applies project-scoped status and evidence-time filters", async () => {
    const objects = await buildR2SearchProjection(
      await buildGoldenSearchPublication(searchFixturePath),
    );
    const bucket = memoryBucket(objects);
    const merged = await searchR2Projection(bucket, {
      query: "producer",
      filters: {
        projectIds: ["apache-kafka"],
        projectStatuses: ["merged"],
      },
      limit: 10,
    });
    const historical = await searchR2Projection(bucket, {
      query: "tiered storage",
      filters: {
        projectIds: ["apache-kafka"],
        occurredBefore: "2022-01-01T00:00:00Z",
      },
      limit: 10,
    });

    expect(merged.results.map((result) => result.entry.sourceTitleRecordId))
      .toEqual(["kafka:github:pr:23203"]);
    expect(merged.results[0]?.projectStatus).toBe("merged");
    expect(historical.results[0]?.matches.every((match) =>
      match.occurredAt < "2022-01-01T00:00:00Z"))
      .toBeTrue();
  });

  test("returns project facets before the project filter and limit", async () => {
    const objects = await buildR2SearchProjection(
      await buildGoldenSearchPublication(searchFixturePath),
    );
    const bucket = memoryBucket(objects);
    const response = await searchR2Projection(bucket, {
      query: "issue 20983",
      filters: {
        projectIds: ["apache-datafusion"],
        occurredAfter: "2026-08-22T00:00:00Z",
      },
      limit: 10,
    });

    expect(response.facets.projects).toEqual([
      { projectId: "apache-datafusion", count: 1 },
      { projectId: "apache-kafka", count: 1 },
    ]);
    expect(response.results).toHaveLength(1);
    expect(response.results.every((result) => result.entry.projectId === "apache-datafusion"))
      .toBeTrue();
    expect(response.results).toHaveLength(
      response.facets.projects.find((facet) => facet.projectId === "apache-datafusion")?.count ?? -1,
    );
  });

  test("an immutable detailRef survives a later current release", async () => {
    const firstObjects = await buildR2SearchProjection(
      await buildGoldenSearchPublication(searchFixturePath, "search-release-1"),
    );
    const firstResponse = await searchR2Projection(memoryBucket(firstObjects), {
      query: "RecordAccumulator.ready()",
      limit: 1,
    });
    const secondObjects = await buildR2SearchProjection(
      await buildGoldenSearchPublication(searchFixturePath, "search-release-2"),
    );
    const combined = [
      ...firstObjects.filter((object) => object.key !== SEARCH_CURRENT_KEY),
      ...secondObjects,
    ];

    const detail = await readSearchDetailProjection(
      memoryBucket(combined),
      firstResponse.results[0]!.detailRef,
    );
    expect(detail?.entry.title).toContain("RecordAccumulator.ready()");
    expect(detail?.entry.reason.kind).toBe("search-match");
  });

  test("rejects a partial Search publication before the current pointer exists", async () => {
    const publication = await buildGoldenSearchPublication(searchFixturePath);
    await expect(buildR2SearchProjection({ ...publication, details: [] }))
      .rejects.toThrow("membership mismatch");
  });
});
