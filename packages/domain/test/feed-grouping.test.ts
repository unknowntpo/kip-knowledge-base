import { describe, expect, test } from "bun:test";
import {
  groupFeedRecords,
  type FeedSourceRecord,
} from "../src/v1/feed-grouping";

describe("Feed record grouping boundary", () => {
  test("groups source records without creating a FeedEntry or key points", () => {
    const records: readonly FeedSourceRecord[] = [
      {
        id: "github:issue:1",
        projectId: "apache-datafusion",
        sourceId: "datafusion:github",
        title: "Reject duplicate field names",
        canonicalUrl: "https://github.com/apache/datafusion/issues/1",
        sourceVersion: "1",
      },
      {
        id: "github:issue:1:comment:2",
        projectId: "apache-datafusion",
        sourceId: "datafusion:github",
        parentRecordId: "github:issue:1",
        textPreview: "Silently dropping a duplicate column is unsafe.",
        canonicalUrl: "https://github.com/apache/datafusion/issues/1#issuecomment-2",
        sourceVersion: "2",
      },
    ];

    const groups = groupFeedRecords({
      records,
      relationships: [],
      activityEvents: [],
      minimumModelConfidence: 0.9,
      window: {
        startedAt: "2026-08-01T00:00:00Z",
        endedAt: "2026-09-01T00:00:00Z",
      },
      clusteringRevision: "github-thread@1",
    });

    expect(groups).toHaveLength(1);
    expect(groups[0].recordIds).toEqual([
      "github:issue:1",
      "github:issue:1:comment:2",
    ]);
    expect("summary" in groups[0]).toBe(false);
    expect("reason" in groups[0]).toBe(false);
  });
});
