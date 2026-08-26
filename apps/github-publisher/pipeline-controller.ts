import {
  defaultReferenceConfig,
  materializeReferenceFeed,
  ReferenceStateStore,
  type MaterializedReferenceResult,
} from "@oss-knowledge-base/reference-pipeline";
import type { FeedPublication } from "@oss-knowledge-base/serving-contract";

import { GitHubConnector, type GitHubPollResult } from "./github-connector";

export interface PipelinePublicationSink {
  publish(publication: FeedPublication): Promise<void>;
}

export type PipelineRunResult =
  | {
      readonly ok: true;
      readonly publication: FeedPublication;
      readonly digest: string;
      readonly inputEventCount: number;
      readonly logicalEventCount: number;
      readonly pageCount: number;
    }
  | {
      readonly ok: false;
      readonly failureKind: "rate-limit" | "transport" | "validation" | "publication";
      readonly error: string;
      readonly retryAfterSeconds: number;
    };

export interface ReferencePipelineControllerOptions {
  readonly connector?: Pick<GitHubConnector, "poll">;
  readonly state?: ReferenceStateStore;
  readonly publicationSink?: PipelinePublicationSink;
  readonly materialize?: (
    events: readonly unknown[],
    materializedAt: string,
  ) => MaterializedReferenceResult;
}

export class ReferencePipelineController {
  readonly state: ReferenceStateStore;
  private readonly connector: Pick<GitHubConnector, "poll">;
  private readonly publicationSink?: PipelinePublicationSink;
  private readonly materialize: (
    events: readonly unknown[],
    materializedAt: string,
  ) => MaterializedReferenceResult;
  private lastFailure?: PipelineRunResult & { readonly ok: false };

  constructor(options: ReferencePipelineControllerOptions = {}) {
    this.connector = options.connector ?? new GitHubConnector();
    this.state = options.state ?? new ReferenceStateStore();
    this.publicationSink = options.publicationSink;
    this.materialize = options.materialize ?? ((events, materializedAt) =>
      materializeReferenceFeed(events, defaultReferenceConfig(materializedAt)));
  }

  async run(materializedAt: string): Promise<PipelineRunResult> {
    const poll = await this.connector.poll(this.state.readCheckpoint(), materializedAt);
    if (!poll.complete) return this.recordPollFailure(poll);

    try {
      this.state.appendDurably(poll.events);
      const result = this.materialize(this.state.readEvents(), materializedAt);
      this.state.commitCheckpoint(poll.candidateCheckpoint);
      if (this.publicationSink !== undefined) await this.publicationSink.publish(result.publication);
      this.lastFailure = undefined;
      return {
        ok: true,
        publication: result.publication,
        digest: result.digest,
        inputEventCount: poll.events.length,
        logicalEventCount: this.state.readEvents().length,
        pageCount: poll.pageCount,
      };
    } catch (error) {
      const failureKind = this.state.readCheckpoint() === poll.candidateCheckpoint
        ? "publication"
        : "validation";
      const failure = {
        ok: false,
        failureKind,
        error: error instanceof Error ? error.message : String(error),
        retryAfterSeconds: 60,
      } as const;
      this.lastFailure = failure;
      return failure;
    }
  }

  getStatus(): Readonly<Record<string, unknown>> {
    return {
      connectorRevision: this.state.readCheckpoint()?.connectorRevision ?? "github@1",
      committedCheckpoint: this.state.readCheckpoint() ?? null,
      logicalEventCount: this.state.readEvents().length,
      lastFailure: this.lastFailure ?? null,
    };
  }

  private recordPollFailure(poll: Extract<GitHubPollResult, { readonly complete: false }>): PipelineRunResult {
    const failure = {
      ok: false,
      failureKind: poll.failureKind,
      error: poll.error,
      retryAfterSeconds: poll.retryAfterSeconds,
    } as const;
    this.lastFailure = failure;
    return failure;
  }
}

export function createLiveFeedLoader(controller = new ReferencePipelineController()) {
  return async (): Promise<FeedPublication> => {
    const result = await controller.run(new Date().toISOString());
    if (!result.ok) throw new Error(`${result.failureKind}: ${result.error}`);
    return result.publication;
  };
}
