import type { FeedPublication } from "@oss-knowledge-base/serving-contract";
import { loadLiveFeed } from "./live-feed";

type FeedLoader = () => Promise<FeedPublication>;

export interface FeedPollerOptions {
  readonly loader?: FeedLoader;
  readonly now?: () => number;
  readonly refreshIntervalMs?: number;
  readonly manualCooldownMs?: number;
}

export class FeedPoller {
  private readonly loader: FeedLoader;
  private readonly now: () => number;
  private readonly refreshIntervalMs: number;
  private readonly manualCooldownMs: number;
  private snapshot?: FeedPublication;
  private completedAt = 0;
  private attemptedAt = 0;
  private inFlight?: Promise<FeedPublication>;
  private timer?: ReturnType<typeof setInterval>;
  private lastError?: string;

  constructor(options: FeedPollerOptions = {}) {
    this.loader = options.loader ?? loadLiveFeed;
    this.now = options.now ?? Date.now;
    this.refreshIntervalMs = options.refreshIntervalMs ?? 5 * 60 * 1000;
    this.manualCooldownMs = options.manualCooldownMs ?? 60 * 1000;
  }

  start(): void {
    if (this.timer !== undefined) return;
    void this.refresh("startup").catch(() => undefined);
    this.timer = setInterval(() => {
      void this.refresh("scheduled").catch(() => undefined);
    }, this.refreshIntervalMs);
  }

  stop(): void {
    if (this.timer !== undefined) clearInterval(this.timer);
    this.timer = undefined;
  }

  async getSnapshot(force = false): Promise<FeedPublication> {
    const now = this.now();
    const age = now - this.completedAt;
    const cooldown = now - this.attemptedAt;
    if (this.snapshot !== undefined) {
      if (!force && age < this.refreshIntervalMs) return this.withRuntimeMetadata(this.snapshot);
      if (force && cooldown < this.manualCooldownMs) return this.withRuntimeMetadata(this.snapshot);
      if (this.lastError !== undefined && cooldown < this.manualCooldownMs) {
        return this.withRuntimeMetadata(this.snapshot);
      }
    }
    return this.refresh(force ? "manual" : "on-demand");
  }

  getStatus(): Record<string, unknown> {
    return {
      ready: this.snapshot !== undefined,
      refreshing: this.inFlight !== undefined,
      completedAt: this.completedAt === 0 ? null : new Date(this.completedAt).toISOString(),
      attemptedAt: this.attemptedAt === 0 ? null : new Date(this.attemptedAt).toISOString(),
      lastError: this.lastError ?? null,
      refreshIntervalMs: this.refreshIntervalMs,
      manualCooldownMs: this.manualCooldownMs,
      retryNotBefore: this.lastError === undefined || this.attemptedAt === 0
        ? null
        : new Date(this.attemptedAt + this.manualCooldownMs).toISOString(),
    };
  }

  private async refresh(reason: string): Promise<FeedPublication> {
    if (this.inFlight !== undefined) return this.inFlight;
    this.attemptedAt = this.now();
    this.inFlight = this.loader()
      .then((payload) => {
        this.snapshot = payload;
        this.completedAt = this.now();
        this.lastError = undefined;
        return this.withRuntimeMetadata(payload, reason);
      })
      .catch((error: unknown) => {
        this.lastError = error instanceof Error ? error.message : String(error);
        if (this.snapshot !== undefined) return this.withRuntimeMetadata(this.snapshot, reason);
        throw error;
      })
      .finally(() => {
        this.inFlight = undefined;
      });
    return this.inFlight;
  }

  private withRuntimeMetadata(
    publication: FeedPublication,
    refreshReason?: string,
  ): FeedPublication {
    return {
      ...publication,
      index: {
        ...publication.index,
        metadata: {
          ...publication.index.metadata,
          refreshReason: refreshReason ?? "snapshot",
          stale: this.lastError !== undefined,
          lastError: this.lastError ?? null,
          pollCompletedAt: this.completedAt === 0 ? null : new Date(this.completedAt).toISOString(),
        },
      },
    };
  }
}
