// Pure helpers for the corpus backfill (tools/backfill): status normalization,
// a small dependency-free HTML→text stripper, best-effort summary extraction,
// and the stub-note renderer. Kept network-free so they are unit-testable with
// fixtures (viewer/test/backfill.test.ts).

/** Canonical status set surfaced by the viewer (see docs/ingestion-spec.md §Backfill). */
export type CanonicalStatus =
  | "Adopted"
  | "Early Access"
  | "Under Discussion"
  | "Discarded"
  | "Unknown";

/**
 * Normalize a raw "Current state" string into the canonical viewer status.
 * Case-insensitive keyword match; order matters (Early Access is a special
 * case of "access", Discarded is checked before the broad discussion bucket).
 * Unparseable / empty → "Unknown" (never guesses).
 */
export function normalizeStatus(raw: string | null | undefined): CanonicalStatus {
  const s = (raw ?? "").toLowerCase();
  if (!s.trim()) return "Unknown";
  if (/early\s*access/.test(s)) return "Early Access";
  if (/\b(adopted|accepted|released|implemented|completed|merged)\b/.test(s)) return "Adopted";
  if (/\b(discarded|rejected|superseded|withdrawn|abandoned|inactive|moved|dormant|dead)\b/.test(s))
    return "Discarded";
  if (/\b(under\s*discussion|discussion|discussing|draft|voting|vote|wip|in\s*progress)\b/.test(s))
    return "Under Discussion";
  return "Unknown";
}

const ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&mdash;": "—",
  "&ndash;": "–",
  "&hellip;": "…",
};

/** Decode the handful of HTML entities Confluence storage format emits. */
export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&[a-z]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m);
}

/**
 * Minimal HTML/Confluence-storage → plain text. Not a parser: block tags become
 * paragraph breaks, everything else is stripped, entities decoded, whitespace
 * collapsed. "Best effort" by design (spec §3).
 */
export function htmlToText(html: string): string {
  const text = html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6]|table|ul|ol|blockquote)>/gi, "\n\n")
    .replace(/<\/(td|th)>/gi, "\t")
    .replace(/<[^>]+>/g, "");
  return decodeEntities(text)
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Lines that are page metadata (the header table on every KIP page), not prose.
const META_LINE =
  /^(current state|discussion thread|vote thread|voting thread|jira|json|release|discussion|please keep|related kips?|motivation|status|authors?)\b/i;

/**
 * Pull the first 1–3 substantive prose paragraphs from a KIP page body.
 * Skips the leading metadata table and boilerplate. Falls back to a fixed
 * sentinel when nothing usable is found.
 */
export function extractSummary(html: string): string {
  const FALLBACK = "(No summary extracted — see the cwiki page.)";
  const paras = htmlToText(html)
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length >= 40 && !META_LINE.test(p) && !p.includes("\t"));
  if (paras.length === 0) return FALLBACK;
  return paras.slice(0, 3).join("\n\n");
}

/** A mailing-list thread permalink + message count. */
export interface Thread {
  url: string;
  count: number;
}

export const LISTS_HOST = "lists.apache.org";

/**
 * Parse a Ponymail stats.lua response into up to 3 thread permalinks + counts.
 * The API shape is probed empirically; this reads the documented `thread_struct`
 * (falling back to `threads`) defensively and never throws.
 */
export function parseThreads(data: unknown): Thread[] {
  const d = data as Record<string, unknown> | null;
  const structs = Array.isArray(d?.thread_struct)
    ? (d!.thread_struct as unknown[])
    : Array.isArray(d?.threads)
      ? (d!.threads as unknown[])
      : [];
  const count = (n: unknown): number => {
    const node = n as Record<string, unknown>;
    const kids = Array.isArray(node?.children) ? (node.children as unknown[]) : [];
    return 1 + kids.reduce((s: number, c) => s + count(c), 0);
  };
  const out: Thread[] = [];
  for (const t of structs) {
    const node = t as Record<string, unknown>;
    const tid = (node?.tid ?? node?.mid ?? node?.id) as string | undefined;
    if (!tid) continue;
    out.push({ url: `https://${LISTS_HOST}/thread/${encodeURIComponent(tid)}`, count: count(t) });
    if (out.length >= 3) break;
  }
  return out;
}

/** A YAML double-quoted scalar (JSON encoding is a valid YAML flow scalar). */
const yamlStr = (s: string): string => JSON.stringify(s ?? "");

/** Everything the stub renderer needs; mirrors the frontmatter schema (spec §3). */
export interface StubNoteInput {
  id: string;
  title: string;
  status: CanonicalStatus;
  cwiki: { pageId: string; version: number; url: string; lastChecked: string };
  threads?: Array<{ url: string; count: number }>;
  summary: string;
}

/**
 * Render a parseable, Obsidian-friendly stub note (spec §3). The frontmatter is
 * emitted by hand (not via a YAML lib) so byte output is deterministic and the
 * lenient parser round-trips it.
 */
export function renderStubNote(i: StubNoteInput): string {
  const lines: string[] = [
    "---",
    `id: ${yamlStr(i.id)}`,
    `title: ${yamlStr(i.title)}`,
    `status: ${yamlStr(i.status)}`,
    "stub: true",
    "cwiki:",
    `  pageId: ${yamlStr(i.cwiki.pageId)}`,
    `  version: ${i.cwiki.version}`,
    `  url: ${yamlStr(i.cwiki.url)}`,
    `  lastChecked: ${yamlStr(i.cwiki.lastChecked)}`,
  ];
  if (i.threads && i.threads.length) {
    lines.push("threads:");
    for (const t of i.threads) {
      lines.push(`  - url: ${yamlStr(t.url)}`);
      lines.push(`    count: ${t.count}`);
    }
  }
  lines.push("tags: []", "related: []", "---", "");
  lines.push("## Summary", "", i.summary, "");
  lines.push(
    `> [!note] Imported stub — full structured content pending. [View on cwiki](${i.cwiki.url})`,
    ""
  );
  return lines.join("\n");
}
