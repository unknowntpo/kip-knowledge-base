#!/usr/bin/env bun
// Corpus-backfill runner (spec §2). Discovers every KIP from the Confluence
// index, then drains the queue: for each pending KIP it resolves a pageId,
// fetches the storage body, writes a *stub* note, and (unless --no-threads)
// looks up mailing-list threads. Checkpoints tools/backfill/queue.json after
// every step so a crash resumes where it left off. Never bulk-retries failures.
//
//   bun tools/backfill/run.ts --dry-run              # discovery + would-crawl list only
//   bun tools/backfill/run.ts --limit 10 --no-threads
//   bun tools/backfill/run.ts                         # drain all pending
//
// All network access goes through the shared politeFetch (spec §6); hosts are
// restricted to cwiki.apache.org + lists.apache.org.

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createPoliteFetch } from "../ingest/polite-fetch";
import {
  CWIKI_HOST,
  DEFAULT_BASE,
  pageUrl,
  parseStatus,
  resolveKipPageId,
} from "../ingest/confluence";
import { splitFrontmatter, readScalar, readCwiki } from "../ingest/frontmatter";
import {
  extractKipLinks,
  fetchIndexHtml,
  loadQueue,
  mergeQueue,
  saveQueue,
} from "./discover";
import type { Queue } from "./discover";
import {
  extractSummary,
  normalizeStatus,
  parseThreads,
  renderStubNote,
  LISTS_HOST,
} from "./note";
import type { Thread } from "./note";
import type { FetchLike } from "../ingest/types";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..");
const VAULT_KIPS = join(REPO_ROOT, "vault", "KIPs");
const QUEUE_PATH = join(REPO_ROOT, "tools", "backfill", "queue.json");

/** Scan the vault for KIP ids, their cwiki pageIds, and which notes are stubs. */
function readVault(dir: string): {
  ids: Set<string>;
  pageIds: Record<string, string>;
  stubs: Set<string>;
} {
  const ids = new Set<string>();
  const pageIds: Record<string, string> = {};
  const stubs = new Set<string>();
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".md"))) {
    const split = splitFrontmatter(readFileSync(join(dir, f), "utf8"));
    if (!split) continue;
    const id = readScalar(split.fm, "id");
    if (!id) continue;
    ids.add(id);
    const cw = readCwiki(split.fm);
    if (cw?.pageId) pageIds[id] = cw.pageId;
    if (readScalar(split.fm, "stub") === "true") stubs.add(id);
  }
  return { ids, pageIds, stubs };
}

async function fetchDetail(
  fetch: FetchLike,
  pageId: string
): Promise<{ version: number; html: string }> {
  const res = await fetch(`${DEFAULT_BASE}/rest/api/content/${pageId}?expand=body.storage,version`);
  if (!res || !res.ok)
    throw new Error(`detail fetch ${res ? res.status : "no-response"} for ${pageId}`);
  const data = await res.json();
  return {
    version: Number(data?.version?.number ?? 0),
    html: (data?.body?.storage?.value as string) ?? "",
  };
}

async function fetchThreads(fetch: FetchLike, kipId: string): Promise<Thread[]> {
  const url =
    `https://${LISTS_HOST}/api/stats.lua?list=dev&domain=kafka.apache.org` +
    `&q=${encodeURIComponent(`"${kipId}"`)}`;
  try {
    const res = await fetch(url);
    if (!res || !res.ok) return [];
    return parseThreads(await res.json());
  } catch {
    return []; // API uncooperative — record no threads and move on (spec §2).
  }
}

const iso = (): string => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

function pendingIds(queue: Queue): string[] {
  return Object.entries(queue.items)
    .filter(([, it]) => it.state === "pending")
    .map(([id]) => id)
    .sort((a, b) => Number(a.slice(4)) - Number(b.slice(4)));
}

function statusBreakdown(queue: Queue): Record<string, number> {
  const by: Record<string, number> = {};
  for (const it of Object.values(queue.items)) by[it.state] = (by[it.state] ?? 0) + 1;
  return by;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const noThreads = argv.includes("--no-threads");
  const li = argv.indexOf("--limit");
  const limit = li >= 0 ? Number(argv[li + 1]) : Infinity;

  const politeFetch = createPoliteFetch({
    fetch: globalThis.fetch,
    followHosts: [CWIKI_HOST, LISTS_HOST],
  });

  // --- discovery (2 requests) ---
  const { ids: vaultIds, pageIds, stubs } = readVault(VAULT_KIPS);
  const { html } = await fetchIndexHtml(politeFetch);
  const discovered = extractKipLinks(html);
  const prev = loadQueue(QUEUE_PATH);
  const queue = mergeQueue(prev, discovered, { existingVaultIds: vaultIds, vaultPageIds: pageIds });
  saveQueue(QUEUE_PATH, queue);

  const sample = discovered.slice(0, 10).map((d) => `  ${d.id}: ${d.title || "(no title)"}`);
  console.log(
    `discovery: ${discovered.length} KIP(s) on the index; queue now has ` +
      `${Object.keys(queue.items).length} entr(ies). Sample:\n${sample.join("\n")}`
  );

  const pending = pendingIds(queue);
  const toCrawl = pending.slice(0, Number.isFinite(limit) ? limit : pending.length);

  if (dryRun) {
    console.log(
      `\n=== DRY RUN — ${pending.length} pending, would crawl ${toCrawl.length} ===\n` +
        toCrawl.map((id) => `  ${id}: ${queue.items[id].title || "(no title)"}`).join("\n")
    );
    return;
  }

  // --- drain ---
  let detail = 0;
  let threadsDone = 0;
  let failed = 0;
  for (const id of toCrawl) {
    const item = queue.items[id];
    try {
      // resolve pageId (exact title, then CQL fallback) if we don't have one
      if (!item.pageId) {
        item.pageId = (await resolveKipPageId(politeFetch, id, item.title)) ?? undefined;
      }
      if (!item.pageId) throw new Error("could not resolve pageId (KAFKA space)");

      const { version, html: body } = await fetchDetail(politeFetch, item.pageId);
      const status = normalizeStatus(parseStatus(body));
      const summary = extractSummary(body);
      const notePath = join(VAULT_KIPS, `${id}.md`);
      // Never clobber a deep, hand-authored note; only (re)write stubs.
      const ownNote = !vaultIds.has(id) || stubs.has(id);
      const write = (threads?: Thread[]): void => {
        if (!ownNote) return;
        writeFileSync(
          notePath,
          renderStubNote({
            id,
            title: item.title || id,
            status,
            cwiki: {
              pageId: item.pageId!,
              version,
              url: pageUrl(DEFAULT_BASE, item.pageId),
              lastChecked: iso(),
            },
            threads,
            summary,
          })
        );
      };

      write();
      item.state = "detail_done";
      delete item.error;
      detail++;
      saveQueue(QUEUE_PATH, queue); // checkpoint

      if (!noThreads) {
        const threads = await fetchThreads(politeFetch, id);
        if (threads.length) write(threads); // re-render with the threads block
        item.state = "threads_done";
        threadsDone++;
        saveQueue(QUEUE_PATH, queue); // checkpoint
      }
    } catch (err) {
      item.state = "failed";
      item.error = err instanceof Error ? err.message : String(err);
      failed++;
      saveQueue(QUEUE_PATH, queue); // checkpoint the failure, keep going
    }
  }

  console.log(
    `\nbackfill: detail_done+=${detail}, threads_done+=${threadsDone}, failed+=${failed}. ` +
      `Queue: ${JSON.stringify(statusBreakdown(queue))}`
  );
}

main().catch((err: unknown) => {
  console.error(`backfill failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
