// @ts-nocheck
// M1 ingestion unit tests (spec §9.2 a–d, §9.4 idempotency, §9.5 politeness,
// §9.6 drift). Adapters take an injected fetch, so every case here mocks the
// network — no real requests are made.
import { describe, expect, it } from "vitest";
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { tmpdir } from "node:os";
import matter from "gray-matter";

import { createPoliteFetch, USER_AGENT, parseRobots } from "../../tools/ingest/polite-fetch.mjs";
import { poll, discoverPageId, parseStatus } from "../../tools/ingest/confluence.mjs";
import { loadState, saveStateIfChanged, dedupeEvents, dedupeKey } from "../../tools/ingest/state.mjs";
import { patchCwiki, readCwiki } from "../../tools/ingest/frontmatter.mjs";
import { applyDeterministic } from "../../tools/ingest/apply.mjs";

const url = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// --- mock helpers -----------------------------------------------------------
const jres = (data, { ok = true, status = 200 } = {}) => ({
  ok,
  status,
  json: async () => data,
  text: async () => (typeof data === "string" ? data : JSON.stringify(data)),
  headers: { get: () => null },
});

// URL-routed mock fetch: first matching [substring, response] wins.
function router(routes) {
  const fetch = async (u) => {
    for (const [pat, resp] of routes) {
      if (u.includes(pat)) return typeof resp === "function" ? resp(u) : resp;
    }
    throw new Error(`unexpected url: ${u}`);
  };
  fetch.calls = [];
  const wrapped = async (u, init) => {
    fetch.calls.push(u);
    return fetch(u, init);
  };
  wrapped.calls = fetch.calls;
  return wrapped;
}

const T1 = "expand=version";
const T2 = "body.storage";
const followOne = [{ kipId: "KIP-500", title: "Replace ZooKeeper", status: "Adopted" }];

// ===========================================================================
// §9.2 (a) — no-change Tier-1 short-circuit
// ===========================================================================
describe("confluence Tier-1 short-circuit (§9.2a)", () => {
  it("emits nothing and never hits Tier-2 when version matches state", async () => {
    const state = { version: 1, confluence: { pages: { "KIP-500": { pageId: "123", version: 37 } } } };
    const fetch = router([
      [T2, jres({})], // must NOT be called
      [T1, jres({ version: { number: 37 } })],
    ]);
    const res = await poll(state, { fetch, followList: followOne });
    expect(res.events).toHaveLength(0);
    expect(res.drift).toHaveLength(0);
    expect(fetch.calls.some((u) => u.includes(T2))).toBe(false);
    // state slice unchanged
    expect(res.nextState.confluence.pages["KIP-500"]).toEqual({ pageId: "123", version: 37 });
  });
});

// ===========================================================================
// §9.2 (b) — version bump -> Tier-2 fetch + `updated` event
// ===========================================================================
describe("confluence version bump (§9.2b)", () => {
  it("fetches Tier-2, emits an `updated` event + drift + snapshot", async () => {
    const state = { version: 1, confluence: { pages: { "KIP-500": { pageId: "123", version: 37 } } } };
    const fetch = router([
      [T2, jres({ version: { number: 38 }, body: { storage: { value: "<p>Current state: Adopted</p>" } } })],
      [T1, jres({ version: { number: 38 } })],
    ]);
    const res = await poll(state, { fetch, followList: followOne, now: () => new Date("2026-07-20T03:17:00Z") });
    expect(res.events).toHaveLength(1);
    const e = res.events[0];
    expect(e.source).toBe("confluence");
    expect(e.kind).toBe("updated");
    expect(e.entity.kipId).toBe("KIP-500");
    expect(e.cursor).toBe("38");
    expect(e.payloadRef).toBe("tools/ingest-cache/confluence/KIP-500.v38.json");
    expect(e.url).toContain("pageId=123");
    expect(res.snapshots).toHaveLength(1);
    expect(res.drift[0]).toEqual({
      kipId: "KIP-500",
      fromVersion: 37,
      toVersion: 38,
      url: e.url,
      observedAt: "2026-07-20T03:17:00Z",
    });
    expect(res.nextState.confluence.pages["KIP-500"].version).toBe(38);
  });

  it("emits `status_changed` when the parsed status differs from the note", async () => {
    const state = { version: 1, confluence: { pages: { "KIP-500": { pageId: "123", version: 37 } } } };
    const fetch = router([
      [T2, jres({ version: { number: 38 }, body: { storage: { value: "Current state: Accepted" } } })],
      [T1, jres({ version: { number: 38 } })],
    ]);
    const res = await poll(state, { fetch, followList: followOne });
    expect(res.events[0].kind).toBe("status_changed");
  });
});

// ===========================================================================
// §9.2 (c) — page-id discovery + CQL fallback
// ===========================================================================
describe("page-id discovery (§9.2c)", () => {
  it("resolves via exact title and skips the CQL search", async () => {
    const fetch = router([
      ["content/search?cql", jres({ results: [{ id: "999" }] })], // must NOT be used
      ["spaceKey=KAFKA&title=", jres({ results: [{ id: "123" }] })],
    ]);
    const id = await discoverPageId(fetch, { kipId: "KIP-500", title: "Replace ZooKeeper" });
    expect(id).toBe("123");
    expect(fetch.calls.some((u) => u.includes("cql"))).toBe(false);
  });

  it("falls back to CQL title~ search when exact title misses", async () => {
    const fetch = router([
      ["content/search?cql", jres({ results: [{ id: "999" }] })],
      ["spaceKey=KAFKA&title=", jres({ results: [] })],
    ]);
    const id = await discoverPageId(fetch, { kipId: "KIP-500", title: "Renamed" });
    expect(id).toBe("999");
    expect(fetch.calls.find((u) => u.includes("cql"))).toContain(encodeURIComponent('title~"KIP-500"'));
  });

  it("discovers, caches pageId in nextState, and emits an event on first sight", async () => {
    const state = { version: 1, confluence: { pages: {} } };
    const fetch = router([
      ["content/search?cql", jres({ results: [] })],
      ["spaceKey=KAFKA&title=", jres({ results: [{ id: "777" }] })],
      [T2, jres({ version: { number: 5 }, body: { storage: { value: "" } } })],
      [T1, jres({ version: { number: 5 } })],
    ]);
    const res = await poll(state, { fetch, followList: followOne });
    expect(res.nextState.confluence.pages["KIP-500"]).toEqual({ pageId: "777", version: 5 });
    expect(res.events).toHaveLength(1);
  });
});

// ===========================================================================
// §9.2 (d) — dedupe by (source, entity, cursor)
// ===========================================================================
describe("dedupe by (source, entity, cursor) (§9.2d)", () => {
  it("collapses re-observations of the same tuple", () => {
    const mk = (cursor, kind) => ({ source: "confluence", entity: { kipId: "KIP-500" }, cursor, kind });
    const events = [mk("38", "updated"), mk("38", "status_changed"), mk("39", "updated")];
    // same (source, entity, cursor) => one; different cursor => kept
    const out = dedupeEvents(events);
    expect(out).toHaveLength(2);
    expect(dedupeKey(events[0])).toBe(dedupeKey(events[1]));
  });

  it("dedupes across runs via a shared seen set", () => {
    const seen = new Set();
    const e = { source: "confluence", entity: { kipId: "KIP-500" }, cursor: "38", kind: "updated" };
    expect(dedupeEvents([e], seen)).toHaveLength(1);
    expect(dedupeEvents([e], seen)).toHaveLength(0);
  });
});

// ===========================================================================
// §9.4 — idempotency: second run with same mock => zero events, zero writes
// ===========================================================================
describe("idempotency (§9.4)", () => {
  it("first run patches; second run writes nothing", () => {
    const dir = join(tmpdir(), `ingest-idem-${Date.now()}`);
    const vaultDir = join(dir, "vault", "KIPs");
    mkdirSync(vaultDir, { recursive: true });
    const notePath = join(vaultDir, "KIP-500.md");
    const original = readFileSync(url("../../vault/KIPs/KIP-500.md"), "utf8");
    writeFileSync(notePath, original);
    const statePath = join(dir, "ingest-state.json");
    const pendingPath = join(dir, "pending-changes.json");

    const nextState = { version: 1, confluence: { pages: { "KIP-500": { pageId: "123", version: 40 } } } };
    const events = [
      {
        id: "x",
        source: "confluence",
        entity: { kipId: "KIP-500" },
        kind: "updated",
        cursor: "40",
        url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=123",
        observedAt: "2026-07-20T03:17:00Z",
        payloadRef: "tools/ingest-cache/confluence/KIP-500.v40.json",
      },
    ];
    const drift = [{ kipId: "KIP-500", fromVersion: null, toVersion: 40, url: events[0].url, observedAt: events[0].observedAt }];
    const snapshots = [{ path: "tools/ingest-cache/confluence/KIP-500.v40.json", data: { ok: true } }];

    // First apply
    const r1 = applyDeterministic({ repoRoot: dir, vaultDir, events, drift, snapshots, nextState, pendingPath });
    expect(r1.notesWritten).toBe(1);
    saveStateIfChanged(statePath, nextState);
    const afterFirst = readFileSync(notePath, "utf8");
    // note now carries the cwiki block, parseable by gray-matter
    expect(matter(afterFirst).data.cwiki.version).toBe(40);
    expect(afterFirst).toContain("cwiki:");

    // Simulate a second poll: state now has version 40, mock Tier-1 returns 40.
    const state2 = loadState(statePath);
    // Re-apply the SAME (already-applied) event is a no-op on the note.
    const r2 = applyDeterministic({ repoRoot: dir, vaultDir, events, drift, snapshots, nextState: state2, pendingPath });
    expect(r2.notesWritten).toBe(0); // already patched -> no rewrite
    expect(r2.driftAdded).toBe(0); // drift deduped by (kipId,toVersion)
    expect(r2.snapshotsWritten).toBe(0); // snapshot content-addressed, already present
    expect(saveStateIfChanged(statePath, state2)).toBe(false); // no state churn
    expect(readFileSync(notePath, "utf8")).toBe(afterFirst); // byte-identical

    // And a real no-change poll emits zero events.
    const fetch = router([
      [T2, jres({})],
      [T1, jres({ version: { number: 40 } })],
    ]);
    // needs the resolved pageId in state:
    state2.confluence.pages["KIP-500"].pageId = "123";
    // Actually run it: version matches -> zero events.
    return poll(state2, { fetch, followList: followOne }).then((res) => {
      expect(res.events).toHaveLength(0);
      rmSync(dir, { recursive: true, force: true });
    });
  });
});

// ===========================================================================
// frontmatter patch is additive + round-trips through gray-matter
// ===========================================================================
describe("frontmatter cwiki patch (spec §4 additive)", () => {
  const original = () => readFileSync(url("../../vault/KIPs/KIP-500.md"), "utf8");
  // The live note gains a cwiki block after the first real ingest run, so the
  // "add" case must strip any existing block to stay state-independent.
  const withoutCwiki = () =>
    original().replace(/^cwiki:\n(?:[ \t]+.*\n)+/m, "");

  it("adds a cwiki block without disturbing existing keys", () => {
    const raw = withoutCwiki();
    const before = matter(raw).data;
    const { changed, newRaw, oldBlock } = patchCwiki(raw, {
      pageId: "123",
      version: 40,
      url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=123",
      lastChecked: "2026-07-20T03:17:00Z",
    });
    expect(changed).toBe(true);
    expect(oldBlock).toBeNull();
    const after = matter(newRaw);
    // existing frontmatter keys byte-preserved
    for (const k of Object.keys(before)) expect(after.data[k]).toEqual(before[k]);
    // new cwiki block parses as a nested map
    expect(after.data.cwiki).toEqual({
      pageId: "123",
      version: 40,
      url: "https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=123",
      lastChecked: "2026-07-20T03:17:00Z",
    });
    // body untouched
    expect(after.content.trim().startsWith("## Summary")).toBe(true);
  });

  it("updates an existing cwiki block in place (idempotent re-render)", () => {
    const raw = original();
    const first = patchCwiki(raw, { pageId: "123", version: 40, url: "u", lastChecked: "t1" }).newRaw;
    const second = patchCwiki(first, { pageId: "123", version: 41, url: "u", lastChecked: "t2" });
    expect(second.changed).toBe(true);
    expect(matter(second.newRaw).data.cwiki.version).toBe(41);
    // re-applying identical fields is a no-op
    const third = patchCwiki(second.newRaw, { pageId: "123", version: 41, url: "u", lastChecked: "t2" });
    expect(third.changed).toBe(false);
  });
});

// ===========================================================================
// §9.5 — politeness enforced in code; adapters cannot bypass politeFetch
// ===========================================================================
describe("politeFetch (§6/§9.5)", () => {
  const opts = (extra = {}) => ({
    fetch: async () => jres({}),
    followHosts: ["cwiki.apache.org"],
    now: () => 0,
    sleep: async () => {},
    random: () => 0,
    checkRobots: false,
    ...extra,
  });

  it("refuses hosts outside the follow list", async () => {
    const pf = createPoliteFetch(opts());
    await expect(pf("https://evil.example.com/x")).rejects.toThrow(/follow list/);
  });

  it("injects the descriptive User-Agent with a contact URL", async () => {
    let seen;
    const pf = createPoliteFetch(opts({ fetch: async (u, init) => ((seen = init.headers["User-Agent"]), jres({})) }));
    await pf("https://cwiki.apache.org/confluence/rest/api/content/1");
    expect(seen).toBe(USER_AGENT);
    expect(USER_AGENT).toMatch(/\+https:\/\/github\.com/);
  });

  it("spaces same-host requests >= 1s apart (rate + jitter)", async () => {
    let clock = 0;
    const times: number[] = [];
    const pf = createPoliteFetch(
      opts({
        now: () => clock,
        sleep: async (ms) => {
          clock += ms;
        },
        fetch: async () => (times.push(clock), jres({})),
        minIntervalMs: 1000,
        maxJitterMs: 0,
      })
    );
    await pf("https://cwiki.apache.org/a");
    await pf("https://cwiki.apache.org/b");
    await pf("https://cwiki.apache.org/c");
    expect(times[1] - times[0]).toBeGreaterThanOrEqual(1000);
    expect(times[2] - times[1]).toBeGreaterThanOrEqual(1000);
  });

  it("never runs more than 2 requests concurrently", async () => {
    let active = 0;
    let maxActive = 0;
    const gates: Array<() => void> = [];
    const pf = createPoliteFetch(
      opts({
        minIntervalMs: 0,
        maxJitterMs: 0,
        fetch: () => {
          active++;
          maxActive = Math.max(maxActive, active);
          return new Promise((resolve) => gates.push(() => (active--, resolve(jres({})))));
        },
      })
    );
    const p1 = pf("https://cwiki.apache.org/1");
    const p2 = pf("https://cwiki.apache.org/2");
    const p3 = pf("https://cwiki.apache.org/3");
    await new Promise((r) => setTimeout(r, 0));
    expect(maxActive).toBeLessThanOrEqual(2); // p3 held back by the semaphore
    // Drain one at a time; releasing p1/p2 admits p3, which registers a new gate.
    while (gates.length || active > 0) {
      const g = gates.shift();
      if (g) g();
      await new Promise((r) => setTimeout(r, 0));
    }
    await Promise.all([p1, p2, p3]);
    expect(maxActive).toBe(2);
  });

  it("honors 429 + Retry-After then succeeds", async () => {
    let n = 0;
    const sleeps: number[] = [];
    const pf = createPoliteFetch(
      opts({
        sleep: async (ms) => {
          sleeps.push(ms);
        },
        fetch: async () => {
          n++;
          if (n === 1) return { ok: false, status: 429, json: async () => ({}), headers: { get: (h) => (h === "retry-after" ? "2" : null) } };
          return jres({ done: true });
        },
      })
    );
    const res = await pf("https://cwiki.apache.org/x");
    expect(await res.json()).toEqual({ done: true });
    expect(sleeps).toContain(2000); // Retry-After: 2s honored
  });

  it("retries 5xx with backoff then succeeds", async () => {
    let n = 0;
    const pf = createPoliteFetch(
      opts({
        random: () => 1, // full-jitter upper bound => deterministic here
        fetch: async () => {
          n++;
          if (n < 3) return { ok: false, status: 503, json: async () => ({}), headers: { get: () => null } };
          return jres({ ok: true });
        },
      })
    );
    const res = await pf("https://cwiki.apache.org/x");
    expect(res.status).toBe(200);
    expect(n).toBe(3);
  });

  it("honors robots.txt Disallow for the follow list", async () => {
    const fetch = async (u) => {
      if (u.endsWith("/robots.txt")) return jres("User-agent: *\nDisallow: /confluence/rest\n");
      return jres({});
    };
    const pf = createPoliteFetch({ fetch, followHosts: ["cwiki.apache.org"], now: () => 0, sleep: async () => {}, random: () => 0 });
    await expect(pf("https://cwiki.apache.org/confluence/rest/api/content/1")).rejects.toThrow(/robots/);
    await expect(pf("https://cwiki.apache.org/confluence/pages/viewpage.action?pageId=1")).resolves.toBeTruthy();
  });

  it("parseRobots collects Disallow for * and our UA", () => {
    const r = parseRobots("User-agent: *\nDisallow: /a\nUser-agent: other\nDisallow: /b\n");
    expect(r.disallow).toEqual(["/a"]);
  });

  it("the confluence adapter is network-pure (cannot bypass the injected fetch)", () => {
    const src = readFileSync(url("../../tools/ingest/confluence.mjs"), "utf8");
    expect(src).not.toMatch(/globalThis\.fetch|window\.fetch/);
    expect(src).not.toMatch(/from ["'].*polite-fetch/); // adapter must not import the wrapper itself
  });
});

// ===========================================================================
// misc: status parser best-effort (spec §5 prefer stale over wrong)
// ===========================================================================
describe("parseStatus best-effort", () => {
  it("extracts a status from storage-format markup, else null", () => {
    expect(parseStatus("<td>Current state:</td> <td>Adopted</td>")).toBe("Adopted");
    expect(parseStatus("no status here")).toBeNull();
    expect(parseStatus(null)).toBeNull();
  });
});
