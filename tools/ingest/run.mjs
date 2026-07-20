#!/usr/bin/env node
// M1 ingestion entrypoint (spec §9).
//
//   node tools/ingest/run.mjs --dry-run   # prints ChangeEvents + would-be
//                                          # frontmatter diffs, writes nothing
//   node tools/ingest/run.mjs             # real run: patches cwiki frontmatter,
//                                          # tools/ingest-state.json,
//                                          # tools/pending-changes.json
//
// The follow list is DERIVED from the vault (vault/KIPs/*.md) — not hardcoded.
// All network access goes through the shared politeFetch (spec §6); adapters
// receive it via injection so they cannot bypass it.

import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createPoliteFetch } from "./polite-fetch.mjs";
import { poll, CWIKI_HOST } from "./confluence.mjs";
import { loadState, saveStateIfChanged, dedupeEvents } from "./state.mjs";
import { applyDeterministic, planFrontmatter } from "./apply.mjs";
import { splitFrontmatter, readScalar } from "./frontmatter.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..");
const VAULT_KIPS = join(REPO_ROOT, "vault", "KIPs");
const STATE_PATH = join(REPO_ROOT, "tools", "ingest-state.json");
const PENDING_PATH = join(REPO_ROOT, "tools", "pending-changes.json");

/** Derive the follow list (kipId, title, status) from the vault notes. */
export function readFollowList(kipsDir = VAULT_KIPS) {
  return readdirSync(kipsDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const raw = readFileSync(join(kipsDir, f), "utf8");
      const split = splitFrontmatter(raw);
      if (!split) throw new Error(`ingest: ${f} has no frontmatter`);
      return {
        kipId: readScalar(split.fm, "id"),
        title: readScalar(split.fm, "title"),
        status: readScalar(split.fm, "status"),
      };
    })
    .filter((k) => k.kipId && k.title)
    .sort((a, b) => Number(a.kipId.slice(4)) - Number(b.kipId.slice(4)));
}

function printDryRun(events, drift, nextState) {
  console.log(`\n=== DRY RUN — ${events.length} ChangeEvent(s), nothing written ===\n`);
  if (events.length === 0) {
    console.log("No upstream changes detected (all Tier-1 version checks matched state).");
  }
  for (const e of events) {
    console.log(`ChangeEvent ${e.id}`);
    console.log(JSON.stringify(e, null, 2));
    const plan = planFrontmatter(VAULT_KIPS, e, nextState, "<dry-run: set on apply>");
    if (plan.missing) {
      console.log(`  (no vault note for ${plan.kipId} — skipped)`);
    } else {
      console.log(`  frontmatter diff for ${plan.kipId} (${plan.changed ? "CHANGED" : "no-op"}):`);
      console.log(`    old:\n${indent(plan.oldBlock ? renderBlock(plan.oldBlock) : "(no cwiki block)")}`);
      console.log(`    new:\n${indent(plan.newBlock)}`);
    }
    console.log("");
  }
  if (drift.length) {
    console.log(`--- drift (would append to tools/pending-changes.json) ---`);
    console.log(JSON.stringify(drift, null, 2));
  }
}

const indent = (s) => s.split("\n").map((l) => `      ${l}`).join("\n");
const renderBlock = (obj) =>
  "cwiki:\n" + Object.entries(obj).map(([k, v]) => `  ${k}: ${v}`).join("\n");

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const followList = readFollowList();
  const state = loadState(STATE_PATH);

  const politeFetch = createPoliteFetch({
    fetch: globalThis.fetch,
    followHosts: [CWIKI_HOST],
  });

  const { events: rawEvents, snapshots, drift, nextState } = await poll(state, {
    fetch: politeFetch,
    followList,
  });
  const events = dedupeEvents(rawEvents);

  if (dryRun) {
    printDryRun(events, drift, nextState);
    return;
  }

  const applied = applyDeterministic({
    repoRoot: REPO_ROOT,
    vaultDir: VAULT_KIPS,
    events,
    drift,
    snapshots,
    nextState,
    pendingPath: PENDING_PATH,
  });
  const stateWritten = saveStateIfChanged(STATE_PATH, nextState);

  console.log(
    `ingest: ${events.length} event(s); notes patched=${applied.notesWritten} ` +
      `[${applied.patched.join(", ")}], drift+=${applied.driftAdded}, ` +
      `snapshots+=${applied.snapshotsWritten}, state ${stateWritten ? "updated" : "unchanged"}`
  );
}

main().catch((err) => {
  console.error(`ingest failed: ${err.message}`);
  process.exitCode = 1;
});
