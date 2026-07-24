// Ingest state + ChangeEvent dedupe (spec §3, §7).
//
// State holds only upstream-derived deterministic values (pageId + version per
// KIP). It carries NO wall-clock fields, so a no-change run reserializes to the
// exact same bytes — this is what makes reruns produce zero state churn (§9.4).

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import type { Entity, IngestState, Source, EventKind, ChangeEvent } from "./types";

export function defaultState(): IngestState {
  return { version: 1, confluence: { pages: {} } };
}

export function loadState(path: string): IngestState {
  if (!existsSync(path)) return defaultState();
  try {
    const s = JSON.parse(readFileSync(path, "utf8")) as IngestState;
    if (!s.confluence) s.confluence = { pages: {} };
    if (!s.confluence.pages) s.confluence.pages = {};
    return s;
  } catch {
    return defaultState();
  }
}

export function serializeState(state: IngestState): string {
  return JSON.stringify(state, null, 2) + "\n";
}

/** Write state only if the serialized content differs. Returns true if written. */
export function saveStateIfChanged(path: string, state: IngestState): boolean {
  const next = serializeState(state);
  if (existsSync(path) && readFileSync(path, "utf8") === next) return false;
  writeFileSync(path, next);
  return true;
}

// --- ChangeEvent identity & dedupe (§3) ---

function entityString(entity: Entity = {}): string {
  // Stable regardless of key insertion order.
  return (["kipId", "jiraKey", "pr", "threadId"] as const)
    .map((k) => `${k}=${entity[k] ?? ""}`)
    .join(",");
}

/** Stable event id = hash of (source, entity, cursor, kind). */
export function eventId(source: Source, entity: Entity, cursor: string, kind: EventKind): string {
  return createHash("sha1")
    .update(`${source}|${entityString(entity)}|${cursor}|${kind}`)
    .digest("hex")
    .slice(0, 16);
}

/** Minimal shape needed to compute a dedupe key (a full ChangeEvent qualifies). */
export type Dedupeable = Pick<ChangeEvent, "source" | "entity" | "cursor">;

/** Dedupe key = (source, entity, cursor) — re-observing the tuple is a no-op. */
export function dedupeKey(event: Dedupeable): string {
  return `${event.source}|${entityString(event.entity)}|${event.cursor}`;
}

/** Filter events whose dedupe key was already seen; mutates `seen`. */
export function dedupeEvents<T extends Dedupeable>(events: T[], seen: Set<string> = new Set()): T[] {
  const out: T[] = [];
  for (const e of events) {
    const k = dedupeKey(e);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
  }
  return out;
}
