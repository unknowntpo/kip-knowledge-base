// Corpus-backfill discovery (spec §1). Fetches the Confluence index page
// "Kafka Improvement Proposals" (space KAFKA) and extracts every KIP referenced
// there — regardless of status. Status is NOT read from the index (fragile table
// parsing); it is derived per-KIP from each detail page during the crawl.
//
// This module is network-pure apart from `fetchIndexHtml`, which takes an
// injected fetch. The parsing + queue-merge helpers are unit-tested with fixtures.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolvePageIdByTitle, DEFAULT_BASE } from "../ingest/confluence";
import { decodeEntities } from "./note";
import type { FetchLike } from "../ingest/types";

export const INDEX_TITLE = "Kafka Improvement Proposals";

/** One KIP reference discovered on the index page. */
export interface Discovered {
  id: string; // "KIP-42"
  num: number;
  title: string; // "" when the reference carried no readable title
}

export type QueueState = "pending" | "detail_done" | "threads_done" | "failed";

/** One queue entry (spec §1). Existing state survives re-discovery. */
export interface QueueItem {
  title: string;
  pageId?: string;
  state: QueueState;
  error?: string;
}

/** The persisted queue (tools/backfill/queue.json). */
export interface Queue {
  generatedAt: string;
  items: Record<string, QueueItem>;
}

const stripTags = (s: string): string => s.replace(/<[^>]+>/g, " ");

// Strip a leading "KIP-N:" / "KIP-N -" prefix, collapse whitespace.
function titleFromFull(full: string): string {
  return full
    .replace(/^\s*KIP-\d+\s*[:\-–—.)]*\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract every KIP reference from the index page's storage-format HTML.
 * Handles Confluence internal links (`ri:content-title="KIP-N: …"`), plain
 * anchors (`<a>KIP-N: …</a>`), and a bare-text fallback. Deduped by number,
 * preferring the reference that carries a readable title.
 */
export function extractKipLinks(html: string): Discovered[] {
  const best = new Map<number, string>(); // num -> best title seen

  const consider = (raw: string): void => {
    const m = raw.match(/KIP-(\d+)/i);
    if (!m) return;
    const num = Number(m[1]);
    const title = titleFromFull(decodeEntities(raw));
    const prev = best.get(num);
    if (prev === undefined) best.set(num, title);
    else if (!prev && title) best.set(num, title); // upgrade untitled -> titled
  };

  // 1. Confluence internal links carry the full target title in an attribute.
  for (const m of html.matchAll(/ri:content-title="([^"]*KIP-\d+[^"]*)"/gi))
    consider(decodeEntities(m[1]));
  // 2. Anchor text.
  for (const m of html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)) {
    const inner = decodeEntities(stripTags(m[1])).replace(/\s+/g, " ").trim();
    if (/KIP-\d+/i.test(inner)) consider(inner);
  }
  // 3. Bare-text fallback: "KIP-N: Title" / "KIP-N - Title" in a text node.
  for (const m of html.matchAll(/KIP-\d+\s*[:\-–—]\s*([^<|\n]{2,120})/gi)) consider(m[0]);

  return [...best.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([num, title]) => ({ id: `KIP-${num}`, num, title }));
}

/**
 * Merge freshly discovered KIPs into an existing queue (spec §1):
 * - existing entries keep their state/error/pageId (only backfill a missing title);
 * - brand-new entries start "pending";
 * - any KIP that already has a vault note starts (at least) "detail_done".
 */
export function mergeQueue(
  prev: Queue | null,
  discovered: Discovered[],
  opts: {
    existingVaultIds: Set<string>;
    vaultPageIds?: Record<string, string>;
    now?: () => Date;
  }
): Queue {
  const items: Record<string, QueueItem> = {};
  for (const [id, it] of Object.entries(prev?.items ?? {})) items[id] = { ...it };

  for (const d of discovered) {
    const existing = items[d.id];
    if (existing) {
      if (!existing.title && d.title) existing.title = d.title;
    } else {
      items[d.id] = { title: d.title, state: "pending" };
    }
  }

  for (const id of opts.existingVaultIds) {
    const it = items[id] ?? (items[id] = { title: "", state: "pending" });
    if (it.state === "pending") it.state = "detail_done";
    const pid = opts.vaultPageIds?.[id];
    if (pid && !it.pageId) it.pageId = pid;
  }

  const now = (opts.now?.() ?? new Date()).toISOString().replace(/\.\d{3}Z$/, "Z");
  return { generatedAt: now, items };
}

/** Fetch + return the index page's storage HTML (2 requests: resolve id, GET body). */
export async function fetchIndexHtml(
  fetch: FetchLike,
  baseUrl: string = DEFAULT_BASE
): Promise<{ pageId: string; html: string }> {
  const pageId = await resolvePageIdByTitle(fetch, INDEX_TITLE, baseUrl);
  if (!pageId) throw new Error(`backfill: could not resolve index page "${INDEX_TITLE}"`);
  const res = await fetch(`${baseUrl}/rest/api/content/${pageId}?expand=body.storage`);
  if (!res || !res.ok) throw new Error(`backfill: index fetch ${res ? res.status : "no-response"}`);
  const data = await res.json();
  return { pageId, html: (data?.body?.storage?.value as string) ?? "" };
}

export function loadQueue(path: string): Queue | null {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as Queue;
}

export function saveQueue(path: string, queue: Queue): void {
  writeFileSync(path, JSON.stringify(queue, null, 2) + "\n");
}
