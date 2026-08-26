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
- It opens or updates a review issue containing the compare/PR link instead of
  writing to `main`. A human creates the pull request from that link.
- The human-created pull request triggers the normal `ci.yml` checks.
- Backfill pushes its checkpoint before the golden-query gate. A failed gate
  preserves the branch but prevents the PR from being opened or updated.
- Automation may create the review issue but may not create, approve, or merge
  the pull request. This avoids GitHub's repository-level setting that combines
  Actions PR creation with permission to approve reviews.
- Workflows use only the ephemeral, repository-scoped `GITHUB_TOKEN`. We do not
  create a personal access token or write deploy key for this path.

## Consequences

- Generated source changes become reviewable and receive the same CI evidence
  as human branches after a maintainer follows the review link.
- `main` can require pull requests and the four established CI checks.
- Review requires one explicit maintainer action to create the pull request.
- Stable automation branches are rewritten from current `main`; they are
  checkpoints, not append-only audit logs. Merged pull requests retain history.

## Revisit when

- ingestion moves out of GitHub Actions into the processing plane;
- automation should be allowed to auto-merge low-risk deterministic updates;
- a repository-owned GitHub App replaces `GITHUB_TOKEN`.
