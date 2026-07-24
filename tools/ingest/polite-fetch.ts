// Shared polite-fetch wrapper (spec §6, non-negotiable).
//
// Every adapter receives fetch via injection; the production entrypoint injects
// the function returned here so that ALL network access is funneled through one
// place that enforces:
//   - Rate: <= 1 request/second per host, with random jitter.
//   - Concurrency: <= 2 in-flight requests total.
//   - User-Agent: descriptive, with a contact URL.
//   - robots.txt: fetched once per host and honored (fail-open on fetch error).
//   - Backpressure: honor 429 + Retry-After; exponential backoff (full jitter,
//     base 1s, cap 60s) on 5xx; max 5 attempts total.
//   - Follow list only: only hosts on the allow-list may be reached.
//
// Timing primitives (now/sleep/random) are injectable so unit tests run instantly
// and deterministically.
import type { FetchLike, FetchResponse } from "./types";

export const USER_AGENT =
  "kip-knowledge-base/1.0 (+https://github.com/unknowntpo/kip-knowledge-base)";

/** Tuning + injectable primitives for {@link createPoliteFetch}. */
export interface PoliteFetchConfig {
  /** underlying fetch (injected so tests can mock the network) */
  fetch: FetchLike;
  /** allow-list of hostnames (e.g. ["cwiki.apache.org"]) */
  followHosts?: string[];
  userAgent?: string;
  minIntervalMs?: number;
  maxJitterMs?: number;
  maxConcurrency?: number;
  maxAttempts?: number;
  backoffBaseMs?: number;
  backoffCapMs?: number;
  checkRobots?: boolean;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

interface RobotsRules {
  disallow: string[];
}

const DEFAULT_OPTS = {
  userAgent: USER_AGENT,
  minIntervalMs: 1000, // >= 1 req/s per host
  maxJitterMs: 400,
  maxConcurrency: 2,
  maxAttempts: 5,
  backoffBaseMs: 1000,
  backoffCapMs: 60000,
  checkRobots: true,
};

/**
 * Build a politeFetch(url, init) function.
 */
export function createPoliteFetch(cfg: PoliteFetchConfig): FetchLike {
  const o = { ...DEFAULT_OPTS, ...cfg };
  const {
    fetch,
    followHosts = [],
    userAgent,
    minIntervalMs,
    maxJitterMs,
    maxConcurrency,
    maxAttempts,
    backoffBaseMs,
    backoffCapMs,
    checkRobots,
    now = () => Date.now(),
    sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms)),
    random = Math.random,
  } = o;

  if (typeof fetch !== "function")
    throw new Error("createPoliteFetch: `fetch` must be injected");

  const allow = new Set(followHosts);
  const lastAt = new Map<string, number>(); // host -> reserved timestamp of next allowed request
  const robotsCache = new Map<string, RobotsRules | null>(); // host -> rules | null

  // --- concurrency semaphore (<= maxConcurrency) ---
  let active = 0;
  const waiters: Array<() => void> = [];
  const acquire = (): Promise<void> =>
    new Promise((resolve) => {
      if (active < maxConcurrency) {
        active++;
        resolve();
      } else {
        waiters.push(resolve);
      }
    });
  const release = (): void => {
    active--;
    const next = waiters.shift();
    if (next) {
      active++;
      next();
    }
  };

  // --- per-host rate gate (>= minInterval + jitter between requests) ---
  async function rateGate(host: string): Promise<void> {
    const interval = minIntervalMs + random() * maxJitterMs;
    const t = now();
    const prev = lastAt.get(host) || 0;
    const earliest = Math.max(t, prev + interval);
    // Reserve the slot before awaiting so concurrent callers chain politely.
    lastAt.set(host, earliest);
    const wait = earliest - t;
    if (wait > 0) await sleep(wait);
  }

  // --- robots.txt (fetch once per host, honor Disallow for our UA; fail-open) ---
  async function robotsAllows(u: URL): Promise<boolean> {
    if (!checkRobots) return true;
    let rules = robotsCache.get(u.host);
    if (rules === undefined) {
      rules = null;
      try {
        const res = await fetch(`${u.protocol}//${u.host}/robots.txt`, {
          headers: { "User-Agent": userAgent },
        });
        if (res && res.ok) {
          rules = parseRobots(await res.text());
        }
      } catch {
        rules = null; // fail-open: unreachable robots.txt does not block us
      }
      robotsCache.set(u.host, rules);
    }
    if (!rules) return true;
    const path = u.pathname + (u.search || "");
    for (const dis of rules.disallow) {
      if (dis && path.startsWith(dis)) return false;
    }
    return true;
  }

  function backoffDelay(attempt: number): number {
    // attempt is 1-based number of the request that just failed.
    const exp = Math.min(backoffCapMs, backoffBaseMs * 2 ** (attempt - 1));
    return random() * exp; // full jitter
  }

  async function withRetries(u: URL, init: RequestInit): Promise<FetchResponse> {
    let attempt = 0;
    for (;;) {
      attempt++;
      await rateGate(u.host);
      const initHeaders = (init.headers ?? {}) as Record<string, string>;
      const res = await fetch(u.toString(), {
        ...init,
        headers: { "User-Agent": userAgent, ...initHeaders },
      });
      const status = res.status;
      if (status === 429) {
        if (attempt >= maxAttempts) return res;
        const ra = Number(res.headers?.get?.("retry-after"));
        const waitMs =
          Number.isFinite(ra) && ra > 0
            ? Math.min(ra * 1000, backoffCapMs)
            : backoffDelay(attempt);
        await sleep(waitMs);
        continue;
      }
      if (status >= 500 && status < 600) {
        if (attempt >= maxAttempts) return res;
        await sleep(backoffDelay(attempt));
        continue;
      }
      return res;
    }
  }

  async function politeFetch(url: string, init: RequestInit = {}): Promise<FetchResponse> {
    const u = new URL(url);
    if (!allow.has(u.host)) {
      throw new Error(
        `politeFetch: refusing to reach host outside the follow list: ${u.host}`
      );
    }
    if (!(await robotsAllows(u))) {
      throw new Error(`politeFetch: blocked by robots.txt: ${u.pathname}`);
    }
    await acquire();
    try {
      return await withRetries(u, init);
    } finally {
      release();
    }
  }

  return politeFetch;
}

// Minimal robots.txt parser: collect Disallow paths that apply to `*` (and to our
// UA token). Good enough for follow-list honoring; not a full RFC implementation.
export function parseRobots(text: string): RobotsRules {
  const disallow: string[] = [];
  let applies = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (field === "user-agent") {
      const ua = value.toLowerCase();
      applies = ua === "*" || ua.includes("kip-knowledge-base");
    } else if (field === "disallow" && applies) {
      if (value) disallow.push(value);
    }
  }
  return { disallow };
}
