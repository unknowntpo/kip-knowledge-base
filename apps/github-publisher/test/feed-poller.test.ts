import { describe, expect, test } from "bun:test";
import type { FeedPublication } from "@oss-knowledge-base/serving-contract";
import { FeedPoller } from "../feed-poller";

function publication(id: string): FeedPublication {
  return {
    index: {
      schema: "osskb.feed-index.v2",
      generatedAt: "2026-08-20T00:00:00Z",
      sourceTypes: {},
      projects: [],
      entries: [{
        displayId: id,
        projectKey: "test",
        status: "open",
        releaseLabel: "fixture",
        authors: [],
        tags: [],
        links: {},
        sourceCounts: {},
        lastActivityAt: "2026-08-20T00:00:00Z",
        searchText: id,
        entry: {
          id: `feed-entry:${id}`,
          projectId: "test",
          title: id,
          summary: id,
          sourceTitleRecordId: `record:${id}`,
          recordIds: [`record:${id}`],
          highlightedRecordIds: [`record:${id}`],
          reason: { kind: "trending", label: "fixture", evidenceEventIds: [] },
          activity: { score: 0, evidenceEventIds: [] },
          grouping: { relationshipIds: [], clusteringRevision: "fixture@1" },
        },
      }],
      metadata: { fetchedAt: "2026-08-20T00:00:00Z" },
    },
    details: [],
  };
}

describe("FeedPoller", () => {
  test("coalesces concurrent initial readers into one GitHub poll", async () => {
    let calls = 0;
    let release: ((value: FeedPublication) => void) | undefined;
    const pending = new Promise<FeedPublication>((resolve) => { release = resolve; });
    const poller = new FeedPoller({
      loader: () => {
        calls += 1;
        return pending;
      },
    });

    const first = poller.getSnapshot();
    const second = poller.getSnapshot();
    release?.(publication("entry-1"));

    expect(await first).toEqual(await second);
    expect(calls).toBe(1);
  });

  test("reuses a fresh snapshot instead of polling per browser request", async () => {
    let calls = 0;
    const poller = new FeedPoller({
      loader: async () => {
        calls += 1;
        return publication(`entry-${calls}`);
      },
    });

    await poller.getSnapshot();
    await poller.getSnapshot();

    expect(calls).toBe(1);
  });

  test("serves the last good snapshot when a later poll fails", async () => {
    let now = 1_000;
    let calls = 0;
    const poller = new FeedPoller({
      now: () => now,
      refreshIntervalMs: 100,
      loader: async () => {
        calls += 1;
        if (calls === 1) return publication("known-good");
        throw new Error("GitHub unavailable");
      },
    });

    await poller.getSnapshot();
    now += 101;
    const stale = await poller.getSnapshot();

    expect(stale.index.entries[0]?.displayId).toBe("known-good");
    expect(stale.index.metadata.stale).toBe(true);
    expect(stale.index.metadata.lastError).toBe("GitHub unavailable");
  });

  test("G8: failure cooldown prevents an on-demand retry storm", async () => {
    let now = 1_000;
    let calls = 0;
    const poller = new FeedPoller({
      now: () => now,
      refreshIntervalMs: 100,
      manualCooldownMs: 1_000,
      loader: async () => {
        calls += 1;
        if (calls === 1) return publication("known-good");
        throw new Error("API rate limit exceeded");
      },
    });

    await poller.getSnapshot();
    now += 101;
    await poller.getSnapshot();
    await poller.getSnapshot();
    await poller.getSnapshot(true);
    expect(calls).toBe(2);

    now += 1_001;
    await poller.getSnapshot();
    expect(calls).toBe(3);
  });
});
