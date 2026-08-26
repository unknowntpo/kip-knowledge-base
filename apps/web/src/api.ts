import type {
  FeedDetail,
  FeedIndex,
  FeedIndexEntry,
  SearchResponseV1,
} from "./types";

async function json<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  const body = await response.json() as T & { readonly error?: string };
  if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`);
  return body;
}

export function fetchFeed(): Promise<FeedIndex> {
  return json<FeedIndex>("/api/feed");
}

export function fetchFeedDetail(item: FeedIndexEntry): Promise<FeedDetail> {
  return json<FeedDetail>(`/api/detail/${encodeURIComponent(item.entry.id)}`);
}

export function fetchEvidenceSearch(input: {
  readonly query: string;
  readonly projectId?: string;
  readonly projectStatus?: string;
  readonly occurredAfter?: string;
  readonly occurredBefore?: string;
  readonly limit?: number;
}): Promise<SearchResponseV1> {
  const params = new URLSearchParams({ q: input.query, limit: String(input.limit ?? 20) });
  if (input.projectId !== undefined) params.append("projectId", input.projectId);
  if (input.projectStatus !== undefined) params.append("projectStatus", input.projectStatus);
  if (input.occurredAfter !== undefined) params.append("occurredAfter", input.occurredAfter);
  if (input.occurredBefore !== undefined) params.append("occurredBefore", input.occurredBefore);
  return json<SearchResponseV1>(`/api/search?${params}`);
}

export function fetchSearchFeedDetail(detailRef: string): Promise<FeedDetail> {
  return json<FeedDetail>(`/api/search-detail/${encodeURIComponent(detailRef)}`);
}
