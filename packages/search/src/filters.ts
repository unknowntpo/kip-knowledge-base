export interface SearchFiltersV1 {
  readonly projectIds?: readonly string[];
  readonly sourceInstanceIds?: readonly string[];
  /** Project-local status keys; valid only with exactly one projectId. */
  readonly projectStatuses?: readonly string[];
  readonly tags?: readonly string[];
  /** Strict lower bound for matching evidence timestamps. */
  readonly occurredAfter?: string;
  /** Strict upper bound for matching evidence timestamps. */
  readonly occurredBefore?: string;
}

/** Runtime validation shared by fixture, lexical, and HTTP serving boundaries. */
export function validateSearchFilters(filters: SearchFiltersV1 | undefined): void {
  if (filters === undefined) return;
  validateList(filters.projectIds, "projectIds");
  validateList(filters.sourceInstanceIds, "sourceInstanceIds");
  validateList(filters.projectStatuses, "projectStatuses");
  validateList(filters.tags, "tags");

  if (filters.projectStatuses !== undefined && filters.projectIds?.length !== 1) {
    throw new Error("projectStatuses requires exactly one projectId");
  }
  const after = validateTimestamp(filters.occurredAfter, "occurredAfter");
  const before = validateTimestamp(filters.occurredBefore, "occurredBefore");
  if (after !== undefined && before !== undefined && after >= before) {
    throw new Error("occurredAfter must be earlier than occurredBefore");
  }
}

function validateList(values: readonly string[] | undefined, label: string): void {
  if (values === undefined) return;
  if (values.length === 0) throw new Error(`${label} must not be empty when supplied`);
  if (values.some((value) => typeof value !== "string" || value.trim().length === 0)) {
    throw new Error(`${label} values must not be empty`);
  }
  if (new Set(values).size !== values.length) throw new Error(`${label} values must be unique`);
}

function validateTimestamp(value: string | undefined, label: string): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) throw new Error(`${label} must be an ISO-compatible timestamp`);
  return parsed;
}
