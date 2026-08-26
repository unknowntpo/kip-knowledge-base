import type { DomainEventV1 } from "@oss-knowledge-base/domain";

export type GitHubRecordKind = "issue" | "pull-request" | "comment";

export interface GitHubEventDataV1 extends Readonly<Record<string, unknown>> {
  readonly contract: "github-record@1";
  readonly recordKind: GitHubRecordKind;
  readonly externalNumber: number;
  readonly parentEntityId?: string;
  readonly title: string;
  readonly excerpt: string;
  readonly author: string;
  readonly authorRole: string;
  readonly occurredAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly nativeState?: "open" | "closed";
  readonly mergedAt?: string;
  readonly labels: readonly string[];
  readonly isBot: boolean;
}

export type GitHubDomainEventV1 = DomainEventV1 & { readonly data: GitHubEventDataV1 };

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function parseGitHubEventDataV1(event: DomainEventV1): GitHubDomainEventV1 {
  const data: unknown = event.data;
  if (!isRecord(data)) throw new Error(`GitHub event ${event.id} data must be an object`);
  const kind = data.recordKind;
  const requiredStrings = ["title", "excerpt", "author", "authorRole", "occurredAt", "createdAt", "updatedAt"] as const;
  if (data.contract !== "github-record@1") throw new Error(`GitHub event ${event.id} has an unsupported data contract`);
  if (!(["issue", "pull-request", "comment"] as const).includes(kind as GitHubRecordKind)) {
    throw new Error(`GitHub event ${event.id} has an invalid recordKind`);
  }
  if (!Number.isInteger(data.externalNumber) || Number(data.externalNumber) <= 0) {
    throw new Error(`GitHub event ${event.id} has an invalid externalNumber`);
  }
  for (const key of requiredStrings) {
    if (typeof data[key] !== "string" || data[key].length === 0) {
      throw new Error(`GitHub event ${event.id} has an invalid ${key}`);
    }
  }
  if (!isStringArray(data.labels) || typeof data.isBot !== "boolean") {
    throw new Error(`GitHub event ${event.id} has invalid labels or isBot`);
  }
  if (kind === "comment" && (typeof data.parentEntityId !== "string" || data.parentEntityId.length === 0)) {
    throw new Error(`GitHub comment ${event.id} requires parentEntityId`);
  }
  if (kind !== "comment" && data.nativeState !== "open" && data.nativeState !== "closed") {
    throw new Error(`GitHub root event ${event.id} requires nativeState`);
  }
  if (data.mergedAt !== undefined && typeof data.mergedAt !== "string") {
    throw new Error(`GitHub event ${event.id} has invalid mergedAt`);
  }
  return event as GitHubDomainEventV1;
}
