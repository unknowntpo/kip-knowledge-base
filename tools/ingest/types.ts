// Shared types for the M1 ingestion pipeline (spec §3, §5, §7).
// Centralized here so adapters, the apply engine, and the entrypoint agree on
// one ChangeEvent / IngestState / drift shape.

/** Upstream source of a change (spec §3). */
export type Source = "confluence" | "jira" | "github" | "list";

/** Kind of atomic change observed (spec §3). */
export type EventKind = "created" | "updated" | "status_changed" | "linked";

/** Entity a change is about; all fields optional (spec §3). */
export interface Entity {
  kipId?: string;
  jiraKey?: string;
  pr?: number;
  threadId?: string;
}

/** One observed atomic change in the append-only normalized feed (spec §3). */
export interface ChangeEvent {
  /** stable hash of (source, entity, cursor, kind) */
  id: string;
  source: Source;
  entity: Entity;
  kind: EventKind;
  /** source-specific watermark at observation (confluence: version.number) */
  cursor: string;
  /** canonical human URL for the change */
  url: string;
  /** ingestion wall clock (ISO-8601) */
  observedAt: string;
  /** relative path to the raw payload snapshot */
  payloadRef: string;
  /** best-effort status parsed from a Tier-2 body (confluence only) */
  parsedStatus?: string;
}

/** Per-KIP Confluence cursor state: resolved pageId + last-seen version. */
export interface ConfluencePageState {
  pageId?: string;
  version?: number;
}

/**
 * Ingest state (spec §7). Holds only upstream-derived deterministic values —
 * NO wall-clock fields — so a no-change run reserializes to identical bytes.
 */
export interface IngestState {
  version: number;
  confluence: { pages: Record<string, ConfluencePageState> };
}

/** A drift record queued in tools/pending-changes.json for human review (§9.6). */
export interface PendingChange {
  kipId: string;
  fromVersion: number | null;
  toVersion: number;
  url: string;
  observedAt: string;
}

/** A content-addressed raw payload snapshot to persist under tools/ingest-cache/. */
export interface Snapshot {
  path: string;
  data: unknown;
}

/** One KIP on the derived follow list (from vault/KIPs/*.md). */
export interface FollowEntry {
  kipId: string;
  title: string;
  status: string;
}

/** Deterministic fields the additive `cwiki:` frontmatter block carries (§4). */
export interface CwikiFields {
  pageId: string;
  version: number;
  url: string;
  lastChecked?: string | null;
}

/** Minimal shape of the Response objects politeFetch/adapters rely on. */
export interface FetchResponse {
  ok: boolean;
  status: number;
  json(): Promise<any>;
  text(): Promise<string>;
  headers?: { get(name: string): string | null } | Headers;
}

/** Injected fetch (spec §2): adapters receive this, never the global. */
export type FetchLike = (url: string, init?: RequestInit) => Promise<FetchResponse>;

/** Result of a single adapter poll (spec §2). */
export interface PollResult {
  events: ChangeEvent[];
  snapshots: Snapshot[];
  drift: PendingChange[];
  nextState: IngestState;
}
