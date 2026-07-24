import raw from "../data/kips.generated.json";
import relatedRaw from "../data/related.generated.json";
import type { Kip, Status } from "../types";

export const KIPS = raw as Kip[];

/** Semantic neighbors per KIP, from tools/semantic/related.json (built by embeddings). */
export interface SimilarKip {
  id: string;
  score: number;
}
const RELATED = relatedRaw as Record<string, SimilarKip[]>;

/**
 * Semantic "Similar KIPs" for `id`, excluding any ids in `exclude` (e.g. the
 * curated frontmatter `related` list) and any that don't resolve to a real KIP.
 */
export function similarKips(id: string | undefined, exclude: string[] = []): SimilarKip[] {
  if (!id) return [];
  const skip = new Set(exclude);
  return (RELATED[id] ?? []).filter((s) => !skip.has(s.id) && getKip(s.id));
}

export const ALL_TAGS = [...new Set(KIPS.flatMap((k) => k.tags))].sort();

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

/** Statuses that actually appear in the corpus, in canonical order. */
export const STATUSES = STATUS_ORDER.filter((s) => KIPS.some((k) => k.status === s));

export const statusCount = (s: Status) => KIPS.filter((k) => k.status === s).length;
export const tagCount = (t: string) => KIPS.filter((k) => k.tags.includes(t)).length;

export const getKip = (id: string | undefined) => KIPS.find((k) => k.id === id);

function haystack(k: Kip) {
  return [k.id, k.title, k.summary, k.tags.join(" "), k.motivation.join(" "), k.category]
    .join(" ")
    .toLowerCase();
}

export function filterKips(query: string, status: string | null, tags: string[]): Kip[] {
  const q = query.trim().toLowerCase();
  return KIPS.filter((k) => {
    if (status && k.status !== status) return false;
    if (tags.length && !tags.every((t) => k.tags.includes(t))) return false;
    if (q && !haystack(k).includes(q)) return false;
    return true;
  });
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
