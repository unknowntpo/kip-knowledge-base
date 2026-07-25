// Runtime data access for the KIP corpus.
//
// The corpus is NOT bundled: viewer/scripts/build-kips.ts emits static JSON into
// public/data/ and we fetch it here (docs/sync-strategy.md §6 — inlining 1144
// KIPs pushed the shipped JS to ~470KB gzip). Two payloads:
//
//   data/index.json      compact entry per KIP (blurb, not full summary) — one
//                        fetch on first paint, drives Browse + filters + counts
//   data/kips/<id>.json  the full Kip, fetched only when a detail page opens
//
// Tradeoff: because the index only carries a ~180-char blurb, client-side search
// matches id + title + blurb + tags + category. Full summary/motivation text is
// no longer searchable in the browser; deep search belongs to the Ask AI
// (semantic) path, which runs server-side.
import { useEffect, useState } from "react";
import type { Kip, Status } from "../types";

/** Compact per-KIP record from data/index.json (written by scripts/build-kips.ts). */
export interface KipIndexEntry {
  id: string;
  title: string;
  status: Status;
  category: string;
  release: string;
  tags: string[];
  /** Summary truncated to ~180 chars on a word boundary — what cards render. */
  blurb: string;
  stub?: boolean;
}

/** Semantic neighbors per KIP, from tools/semantic/related.json (built by embeddings). */
export interface SimilarKip {
  id: string;
  score: number;
}

// import.meta.env.BASE_URL always ends in "/" under Vite, but be defensive so the
// app works under any base (root, subpath, or a preview deployment).
const base = import.meta.env.BASE_URL.replace(/\/*$/, "/");
const dataUrl = (path: string) => `${base}data/${path}`;

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(dataUrl(path));
  if (!res.ok) throw new Error(`${path}: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

export const STATUS_ORDER: Status[] = [
  "Adopted",
  "Early Access",
  "Under Discussion",
  "Discarded",
  "Unknown",
];

export const STATUS_META: Record<Status, { bg: string; text: string; dot: string }> = {
  Adopted: { bg: "#e6f3ec", text: "#1f7a4d", dot: "#2b9e63" },
  "Early Access": { bg: "#fdf2dc", text: "#9a6410", dot: "#d69828" },
  "Under Discussion": { bg: "#f7efe9", text: "#a3542a", dot: "#cf7a3f" },
  Discarded: { bg: "#efeef2", text: "#6b5e79", dot: "#8a7d99" },
  Unknown: { bg: "#f0efec", text: "#6f6c66", dot: "#a7a39a" },
};

/** The loaded index plus everything derived from it (tags, counts, search). */
export interface KipIndex {
  kips: KipIndexEntry[];
  /** Tags present in the corpus, sorted. */
  allTags: string[];
  /** Statuses that actually appear in the corpus, in canonical order. */
  statuses: Status[];
  get(id: string | undefined): KipIndexEntry | undefined;
  statusCount(s: Status): number;
  tagCount(t: string): number;
  filter(query: string, status: string | null, tags: string[]): KipIndexEntry[];
  /**
   * Semantic "Similar KIPs" for `id`, excluding any ids in `exclude` (e.g. the
   * curated frontmatter `related` list) and any that don't resolve to a real KIP.
   */
  similar(id: string | undefined, exclude?: string[]): SimilarKip[];
}

function makeIndex(kips: KipIndexEntry[], related: Record<string, SimilarKip[]>): KipIndex {
  const byId = new Map(kips.map((k) => [k.id, k]));
  const statusCounts = new Map<string, number>();
  const tagCounts = new Map<string, number>();
  // One pass instead of a scan per status/tag — the sidebar asks for ~27 counts.
  for (const k of kips) {
    statusCounts.set(k.status, (statusCounts.get(k.status) ?? 0) + 1);
    for (const t of k.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  }
  // Precomputed lowercase haystack per KIP so filtering 1144 entries per
  // keystroke stays cheap (no per-call string building).
  const hay = new Map(
    kips.map((k) => [
      k.id,
      [k.id, k.title, k.blurb, k.tags.join(" "), k.category].join(" ").toLowerCase(),
    ])
  );

  const get = (id: string | undefined) => (id ? byId.get(id) : undefined);

  return {
    kips,
    allTags: [...tagCounts.keys()].sort(),
    statuses: STATUS_ORDER.filter((s) => statusCounts.has(s)),
    get,
    statusCount: (s) => statusCounts.get(s) ?? 0,
    tagCount: (t) => tagCounts.get(t) ?? 0,
    filter(query, status, tags) {
      const q = query.trim().toLowerCase();
      return kips.filter((k) => {
        if (status && k.status !== status) return false;
        if (tags.length && !tags.every((t) => k.tags.includes(t))) return false;
        if (q && !hay.get(k.id)!.includes(q)) return false;
        return true;
      });
    },
    similar(id, exclude = []) {
      if (!id) return [];
      const skip = new Set(exclude);
      return (related[id] ?? []).filter((s) => !skip.has(s.id) && byId.has(s.id));
    },
  };
}

let indexPromise: Promise<KipIndex> | null = null;
let indexCache: KipIndex | null = null;

/** Load (once) the KIP index + semantic neighbor map. */
export function loadIndex(): Promise<KipIndex> {
  if (!indexPromise) {
    indexPromise = Promise.all([
      fetchJson<KipIndexEntry[]>("index.json"),
      // Missing/unbuilt related.json must not break Browse — degrade to no neighbors.
      fetchJson<Record<string, SimilarKip[]>>("related.json").catch(() => ({})),
    ]).then(([kips, related]) => {
      indexCache = makeIndex(kips, related);
      return indexCache;
    });
  }
  return indexPromise;
}

/**
 * React binding for {@link loadIndex}. Resolves synchronously on later mounts
 * (the module-level cache), so only the first paint shows a loading state.
 */
export function useKipIndex(): { index: KipIndex | null; error: string | null } {
  const [index, setIndex] = useState<KipIndex | null>(indexCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (indexCache) return;
    let live = true;
    loadIndex().then(
      (i) => live && setIndex(i),
      (e: unknown) => live && setError(e instanceof Error ? e.message : String(e))
    );
    return () => {
      live = false;
    };
  }, []);

  return { index, error };
}

// Detail payloads are cached for the session: revisiting a KIP (or bouncing
// between Similar KIPs) costs nothing after the first fetch. `null` = 404.
const kipCache = new Map<string, Kip | null>();
const kipInflight = new Map<string, Promise<Kip | null>>();

/** Fetch the full Kip for `id`; resolves to null when there is no such KIP. */
export function loadKip(id: string): Promise<Kip | null> {
  if (kipCache.has(id)) return Promise.resolve(kipCache.get(id)!);
  let p = kipInflight.get(id);
  if (!p) {
    p = fetchJson<Kip>(`kips/${encodeURIComponent(id)}.json`)
      .catch(() => null)
      .then((kip) => {
        kipCache.set(id, kip);
        kipInflight.delete(id);
        return kip;
      });
    kipInflight.set(id, p);
  }
  return p;
}

// Deterministic avatar color + initials for discussion authors.
const AVATAR_PALETTE = ["#3a53b0", "#2b7a5b", "#a3542a", "#7a3b8f", "#3f7fa0", "#96602a"];
export function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}
export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}
