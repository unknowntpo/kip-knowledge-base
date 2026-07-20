// Ingest state + ChangeEvent dedupe (spec §3, §7).
//
// State holds only upstream-derived deterministic values (pageId + version per
// KIP). It carries NO wall-clock fields, so a no-change run reserializes to the
// exact same bytes — this is what makes reruns produce zero state churn (§9.4).

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";

export function defaultState() {
  return { version: 1, confluence: { pages: {} } };
}

export function loadState(path) {
  if (!existsSync(path)) return defaultState();
  try {
    const s = JSON.parse(readFileSync(path, "utf8"));
    if (!s.confluence) s.confluence = { pages: {} };
    if (!s.confluence.pages) s.confluence.pages = {};
    return s;
  } catch {
    return defaultState();
  }
}

export function serializeState(state) {
  return JSON.stringify(state, null, 2) + "\n";
}

/** Write state only if the serialized content differs. Returns true if written. */
export function saveStateIfChanged(path, state) {
  const next = serializeState(state);
  if (existsSync(path) && readFileSync(path, "utf8") === next) return false;
  writeFileSync(path, next);
  return true;
}

// --- ChangeEvent identity & dedupe (§3) ---

function entityString(entity = {}) {
  // Stable regardless of key insertion order.
  return ["kipId", "jiraKey", "pr", "threadId"]
    .map((k) => `${k}=${entity[k] ?? ""}`)
    .join(",");
}

/** Stable event id = hash of (source, entity, cursor, kind). */
export function eventId(source, entity, cursor, kind) {
  return createHash("sha1")
    .update(`${source}|${entityString(entity)}|${cursor}|${kind}`)
    .digest("hex")
    .slice(0, 16);
}

/** Dedupe key = (source, entity, cursor) — re-observing the tuple is a no-op. */
export function dedupeKey(event) {
  return `${event.source}|${entityString(event.entity)}|${event.cursor}`;
}

/** Filter events whose dedupe key was already seen; mutates `seen`. */
export function dedupeEvents(events, seen = new Set()) {
  const out = [];
  for (const e of events) {
    const k = dedupeKey(e);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
  }
  return out;
}
