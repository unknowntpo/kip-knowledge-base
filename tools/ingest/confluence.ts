// Confluence adapter (spec §2.1) — cwiki.apache.org, space KAFKA.
//
// Two-tier polling: Tier 1 (cheap, every poll) compares version.number; Tier 2
// (only on a bump) fetches the storage-format body and emits a ChangeEvent.
// The adapter is pure w.r.t. the network: `fetch` is injected. It never writes
// the vault — it emits ChangeEvents, cache snapshots, drift records, and its
// slice of nextState.

import { eventId } from "./state";
import type {
  ChangeEvent,
  FetchLike,
  FollowEntry,
  IngestState,
  PendingChange,
  PollResult,
  Snapshot,
} from "./types";

export const CWIKI_HOST = "cwiki.apache.org";
export const DEFAULT_BASE = `https://${CWIKI_HOST}/confluence`;
export const SPACE_KEY = "KAFKA";

function toIso(d: Date | string | number): string {
  return (d instanceof Date ? d : new Date(d)).toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** Canonical human URL for a page. */
export function pageUrl(baseUrl: string | undefined, pageId: string | undefined): string {
  return `${baseUrl}/pages/viewpage.action?pageId=${pageId}`;
}

async function json(fetch: FetchLike, url: string): Promise<any> {
  const res = await fetch(url);
  if (!res || !res.ok) {
    const code = res ? res.status : "no-response";
    throw new Error(`confluence: ${code} for ${url}`);
  }
  return res.json();
}

/** Options for {@link discoverPageId}. */
export interface DiscoverOpts {
  kipId: string;
  title: string;
  baseUrl?: string;
}

/**
 * Resolve a Confluence page id from an EXACT title in space KAFKA.
 * One request: `GET /rest/api/content?spaceKey=KAFKA&title=<exact>`.
 * Returns the pageId string or null. Reused by the KIP discovery helper below
 * and by the corpus-backfill index resolution (tools/backfill).
 */
export async function resolvePageIdByTitle(
  fetch: FetchLike,
  title: string,
  baseUrl: string = DEFAULT_BASE
): Promise<string | null> {
  const url = `${baseUrl}/rest/api/content?spaceKey=${SPACE_KEY}&title=${encodeURIComponent(title)}`;
  const res = await json(fetch, url);
  if (res?.results?.length) return String(res.results[0].id);
  return null;
}

/**
 * Resolve a page id for a KIP (spec §2.1). Exact-title lookup first
 * (`KIP-500: <title>`), CQL `title~"KIP-500"` fallback if that misses.
 * Returns the pageId string or null.
 */
export async function discoverPageId(
  fetch: FetchLike,
  { kipId, title, baseUrl = DEFAULT_BASE }: DiscoverOpts
): Promise<string | null> {
  const exact = await resolvePageIdByTitle(fetch, `${kipId}: ${title}`, baseUrl);
  if (exact) return exact;

  const cql = `title~"${kipId}"`;
  const cqlUrl = `${baseUrl}/rest/api/content/search?cql=${encodeURIComponent(cql)}`;
  const search = await json(fetch, cqlUrl);
  if (search?.results?.length) return String(search.results[0].id);

  return null;
}

/**
 * Resolve a KIP's page id, SCOPED to the KAFKA space and pinned to the exact KIP
 * number (spec: corpus backfill). Unlike {@link discoverPageId}, whose CQL
 * fallback is space-agnostic (it can match a same-numbered KIP in another
 * Confluence space, e.g. Knox), this:
 *   1. tries the exact title `KIP-N: <title>` in space KAFKA;
 *   2. falls back to `space = KAFKA AND title ~ "KIP-N"`, then keeps only a
 *      result whose title begins with the exact KIP number (so "KIP-11" never
 *      resolves to "KIP-110").
 * Returns null when nothing matches with confidence — the caller marks the item
 * failed rather than importing a wrong page (prefer skip over wrong).
 */
export async function resolveKipPageId(
  fetch: FetchLike,
  kipId: string,
  title: string,
  baseUrl: string = DEFAULT_BASE
): Promise<string | null> {
  if (title) {
    const exact = await resolvePageIdByTitle(fetch, `${kipId}: ${title}`, baseUrl);
    if (exact) return exact;
  }
  const cql = `space = ${SPACE_KEY} AND title ~ "${kipId}"`;
  const url = `${baseUrl}/rest/api/content/search?cql=${encodeURIComponent(cql)}&limit=25`;
  const search = await json(fetch, url);
  const results: Array<{ id?: unknown; title?: unknown }> = search?.results ?? [];
  const boundary = new RegExp(`^\\s*\\[?${kipId}(?![0-9])`);
  const hit = results.find((r) => boundary.test(String(r.title ?? "")));
  return hit ? String(hit.id) : null;
}

// Best-effort status extraction from the storage-format body. Confluence KIP
// pages carry a "Current state: <status>" line. Per spec §5 ("prefer stale over
// wrong") a miss returns null and never drives a frontmatter rewrite.
export function parseStatus(storageValue: unknown): string | null {
  if (!storageValue || typeof storageValue !== "string") return null;
  const text = storageValue.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ");
  const m = text.match(/Current state[:\s]+([A-Za-z][A-Za-z /()-]*?)(?:\s{2,}|$|\.)/);
  if (!m) return null;
  return m[1].trim();
}

/** Injected deps + follow list for a single {@link poll}. */
export interface PollDeps {
  fetch: FetchLike;
  followList: FollowEntry[];
  now?: () => Date;
  baseUrl?: string;
}

/**
 * Poll Confluence for the follow list.
 */
export async function poll(
  state: IngestState,
  { fetch, followList, now = () => new Date(), baseUrl = DEFAULT_BASE }: PollDeps
): Promise<PollResult> {
  const prevPages = state?.confluence?.pages || {};
  const nextPages = { ...prevPages };
  const events: ChangeEvent[] = [];
  const snapshots: Snapshot[] = [];
  const drift: PendingChange[] = [];

  for (const kip of followList) {
    const { kipId, title, status: noteStatus } = kip;
    const entry = { ...(nextPages[kipId] || {}) };

    // Page-id discovery (once per KIP, then cached in state).
    if (!entry.pageId) {
      const pageId = await discoverPageId(fetch, { kipId, title, baseUrl });
      if (!pageId) {
        // Can't resolve — prefer stale over wrong; leave state untouched.
        continue;
      }
      entry.pageId = pageId;
    }

    // Tier 1: cheap version check.
    const t1 = await json(fetch, `${baseUrl}/rest/api/content/${entry.pageId}?expand=version`);
    const newVersion: number | undefined = t1?.version?.number;
    if (newVersion == null) {
      nextPages[kipId] = entry;
      continue;
    }
    if (entry.version === newVersion) {
      // No change -> emit nothing (Tier-1 short-circuit).
      nextPages[kipId] = entry;
      continue;
    }

    // Tier 2: only when Tier 1 shows a bump (or first observation).
    const t2 = await json(
      fetch,
      `${baseUrl}/rest/api/content/${entry.pageId}?expand=body.storage,version`
    );
    const observedAt = toIso(now());
    const url = pageUrl(baseUrl, entry.pageId);
    const payloadRef = `tools/ingest-cache/confluence/${kipId}.v${newVersion}.json`;
    const parsedStatus = parseStatus(t2?.body?.storage?.value);
    const kind =
      parsedStatus && noteStatus && parsedStatus !== noteStatus ? "status_changed" : "updated";
    const cursor = String(newVersion);

    const event: ChangeEvent = {
      id: eventId("confluence", { kipId }, cursor, kind),
      source: "confluence",
      entity: { kipId },
      kind,
      cursor,
      url,
      observedAt,
      payloadRef,
    };
    if (parsedStatus) event.parsedStatus = parsedStatus;
    events.push(event);
    snapshots.push({ path: payloadRef, data: t2 });
    // Drift: Tier-2 body change whose prose implications need review (§9.6).
    drift.push({
      kipId,
      fromVersion: entry.version ?? null,
      toVersion: newVersion,
      url,
      observedAt,
    });

    entry.version = newVersion;
    entry.pageId = String(entry.pageId);
    nextPages[kipId] = entry;
  }

  return { events, snapshots, drift, nextState: { ...state, confluence: { pages: nextPages } } };
}
