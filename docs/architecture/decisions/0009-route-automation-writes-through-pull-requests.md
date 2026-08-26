# ADR-0009: Route automation writes through pull requests

- Status: Accepted
- Date: 2026-08-26

## Context

Confluence ingestion and corpus backfill originally committed generated files
directly to `main`. That prevented us from requiring pull requests and CI on
the branch without either breaking scheduled updates or granting a durable
credential permission to bypass the rule.

Backfill also has an unusual durability requirement: a crawl may take roughly
50 minutes, so a later retrieval-quality failure must not erase its queue
checkpoint.

## Decision

- Each writer owns a stable branch:
  `automation/confluence-ingest` or `automation/corpus-backfill`.
- A workflow resets that branch from the current `main`, commits generated
  changes, and updates the remote branch with `--force-with-lease`.
- It opens or updates a pull request instead of writing to `main`.
- It explicitly dispatches `ci.yml` for the automation branch. GitHub documents
  `workflow_dispatch` as the recursion-safe exception for `GITHUB_TOKEN` events.
- Backfill pushes its checkpoint before the golden-query gate. A failed gate
  preserves the branch but prevents the PR from being opened or updated.
- Automation may create a PR but may not approve or merge it.
- Workflows use only the ephemeral, repository-scoped `GITHUB_TOKEN`. We do not
  create a personal access token or write deploy key for this path.

## Consequences

- Generated source changes become reviewable and receive the same CI evidence
  as human branches.
- `main` can require pull requests and the four established CI checks.
- A workflow-created pull request may show an approval-required event run;
  the explicitly dispatched run supplies the checks without a long-lived token.
- Stable automation branches are rewritten from current `main`; they are
  checkpoints, not append-only audit logs. Merged pull requests retain history.

## Revisit when

- ingestion moves out of GitHub Actions into the processing plane;
- automation should be allowed to auto-merge low-risk deterministic updates;
- a repository-owned GitHub App replaces `GITHUB_TOKEN`.
