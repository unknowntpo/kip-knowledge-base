// Apply Engine — deterministic path only (spec §5, M1).
//
// M1 writes exactly one deterministic thing back to the vault: the additive
// `cwiki:` frontmatter block (pageId, version, url, lastChecked). Body/prose is
// NEVER rewritten — Tier-2 body changes are recorded as drift in
// tools/pending-changes.json for human review (§9.6). Everything here is
// idempotent: applying the same events twice yields identical files.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { patchCwiki, readCwiki } from "./frontmatter.mjs";
import { pageUrl } from "./confluence.mjs";

/** Map kipId -> note path under the vault. */
export function notePath(vaultDir, kipId) {
  return join(vaultDir, `${kipId}.md`);
}

// Fields the deterministic cwiki block carries, derived from an event + state.
function cwikiFields({ pageId, version, url, lastChecked }) {
  return { pageId: String(pageId), version, url, lastChecked };
}

/**
 * Compute the frontmatter patch a single confluence event WOULD apply, without
 * writing. Used by --dry-run. `lastChecked` is passed through (a placeholder in
 * dry-run) so the printed diff is representative.
 */
export function planFrontmatter(vaultDir, event, nextState, lastChecked) {
  const kipId = event.entity.kipId;
  const page = nextState.confluence.pages[kipId] || {};
  const p = notePath(vaultDir, kipId);
  if (!existsSync(p)) return { kipId, missing: true };
  const raw = readFileSync(p, "utf8");
  const fields = cwikiFields({
    pageId: page.pageId,
    version: Number(event.cursor),
    url: event.url,
    lastChecked,
  });
  const { changed, oldBlock, newBlock } = patchCwiki(raw, fields);
  return { kipId, path: p, changed, oldBlock, newBlock };
}

// Append drift records idempotently (dedupe by kipId + toVersion).
function appendPending(pendingPath, driftItems) {
  let existing = [];
  if (existsSync(pendingPath)) {
    try {
      existing = JSON.parse(readFileSync(pendingPath, "utf8"));
      if (!Array.isArray(existing)) existing = [];
    } catch {
      existing = [];
    }
  }
  const seen = new Set(existing.map((d) => `${d.kipId}|${d.toVersion}`));
  let added = 0;
  for (const d of driftItems) {
    const k = `${d.kipId}|${d.toVersion}`;
    if (seen.has(k)) continue;
    seen.add(k);
    existing.push(d);
    added++;
  }
  if (added > 0) writeFileSync(pendingPath, JSON.stringify(existing, null, 2) + "\n");
  return added;
}

function writeSnapshots(repoRoot, snapshots) {
  let written = 0;
  for (const s of snapshots) {
    const abs = join(repoRoot, s.path);
    if (existsSync(abs)) continue; // snapshots are content-addressed by version
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, JSON.stringify(s.data, null, 2) + "\n");
    written++;
  }
  return written;
}

/**
 * Apply the deterministic path for a completed poll.
 *
 * @returns {{ notesWritten:number, driftAdded:number, snapshotsWritten:number, patched:string[] }}
 */
export function applyDeterministic({
  repoRoot,
  vaultDir,
  events,
  drift,
  snapshots,
  nextState,
  pendingPath,
  now = () => new Date(),
}) {
  const lastChecked = (now() instanceof Date ? now() : new Date(now()))
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z");
  const patched = [];

  for (const event of events) {
    if (event.source !== "confluence" || !event.entity?.kipId) continue;
    const kipId = event.entity.kipId;
    const page = nextState.confluence.pages[kipId] || {};
    const p = notePath(vaultDir, kipId);
    if (!existsSync(p)) continue;
    const raw = readFileSync(p, "utf8");
    const fields = cwikiFields({
      pageId: page.pageId,
      version: Number(event.cursor),
      url: event.url || pageUrl(undefined, page.pageId),
      lastChecked,
    });
    const { changed, newRaw } = patchCwiki(raw, fields);
    if (changed) {
      writeFileSync(p, newRaw);
      patched.push(kipId);
    }
  }

  const snapshotsWritten = writeSnapshots(repoRoot, snapshots);
  const driftAdded = appendPending(pendingPath, drift);
  return {
    notesWritten: patched.length,
    driftAdded,
    snapshotsWritten,
    patched,
  };
}

export { readCwiki };
