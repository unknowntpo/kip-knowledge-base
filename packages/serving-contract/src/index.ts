import type { FeedDetail, FeedEntry } from "@oss-knowledge-base/domain";

export interface FeedSourceType {
  readonly key: string;
  readonly label: string;
  readonly full: string;
}

export interface FeedProjectProfile {
  readonly key: string;
  readonly label: string;
  readonly profileVersion: string;
  readonly statusPolicyRef: string;
  readonly statusFacetKey: string;
  readonly sources: readonly string[];
  readonly statuses: readonly { readonly key: string; readonly label: string }[];
}

/** Compact public projection for one card. Full records belong to FeedDetail. */
export interface FeedIndexEntry {
  readonly displayId: string;
  readonly projectKey: string;
  readonly status: string;
  readonly releaseLabel: string;
  readonly authors: readonly string[];
  readonly tags: readonly string[];
  readonly links: Readonly<Record<string, string>>;
  readonly sourceCounts: Readonly<Record<string, number>>;
  readonly lastActivityAt: string;
  readonly searchText: string;
  readonly entry: FeedEntry;
}

export interface FeedIndex {
  readonly schema: "osskb.feed-index.v2";
  readonly generatedAt: string;
  readonly sourceTypes: Readonly<Record<string, FeedSourceType>>;
  readonly projects: readonly FeedProjectProfile[];
  readonly entries: readonly FeedIndexEntry[];
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Publisher input. Details are separated before anything is written to R2. */
export interface FeedPublication {
  readonly index: FeedIndex;
  readonly details: readonly FeedDetail[];
}

export interface FeedManifest {
  readonly schema: "osskb.feed-manifest.v2";
  readonly releaseId: string;
  readonly generatedAt: string;
  readonly feedIndexKey: string;
  readonly detailPrefix: string;
  readonly entryCount: number;
}

export * from "./r2";
export * from "./publication-set";
export * from "./search-feed-materializer";
export * from "./search-r2";
