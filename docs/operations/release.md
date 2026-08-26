# Release workflow

Status: Active since v0.1.0

Decision: ADR-0008

## Delivery path

```text
feature branch ── pull request ──> CI only
main push      ──────────────────> CI ──> development Pages
vX.Y.Z tag     ──────────────────> CI + main ancestry ──> production Pages
```

| Git event | Required evidence | Deployment |
| --- | --- | --- |
| Pull request | typecheck, build, unit, integration, desktop/mobile E2E | none |
| Push to `main` | same CI, exact retained `dist` artifact | `oss-knowledge-base-dev.pages.dev` |
| Push `vX.Y.Z` tag | same CI, valid tag, tagged commit reachable from `main` | `oss-knowledge-base.pages.dev` |

## Acceptance assertions

### R1 — Branch isolation

Given two open feature branches, when both update or rerun CI, then neither
changes development or production Pages state.

### R2 — Main promotes development only

Given a commit lands on `main`, when any required job fails, then no Pages
deploy job runs. When all jobs pass, only development receives the retained CI
artifact for that exact SHA.

### R3 — Tags promote production only

Given `vX.Y.Z` points to a commit reachable from `main`, when all jobs pass,
then production receives the retained artifact for that SHA. A malformed tag or
a tag outside `main` fails before deployment.

### R4 — Deployment and data publication stay separate

Given either deploy runs, then it performs no GitHub polling and writes no Feed
or Search R2 release/current pointer.

### R5 — Production releases are not cancelled

Given two valid tags arrive close together, then their production deployments
serialize. Development may cancel a superseded deployment.

## Automation writes

Scheduled ingestion and manual backfill never push generated data directly to
`main`. Each workflow:

1. starts from the current `main`;
2. checkpoints changes on its dedicated `automation/*` branch;
3. opens or updates a pull request;
4. explicitly dispatches this repository's CI for the automation branch;
5. waits for a human to review and merge.

Backfill checkpoints before its golden-query gate because the crawl is costly.
A failed gate preserves the branch but does not open or update its PR.

The workflows use only their ephemeral repository `GITHUB_TOKEN`; no personal
access token, deploy key, automatic approval, or automatic merge is allowed.

## One-time bootstrap

External bootstrap state:

1. **Done:** Pages project `oss-knowledge-base-dev` uses production branch
   `main`.
2. **Done:** Pages project `oss-knowledge-base` uses production branch
   `production`.
3. **Done:** both projects bind `OSS_KB_BUCKET` to the existing private
   `oss-knowledge-base-poc` R2 bucket.
4. **Done:** scoped `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`
   repository secrets exist.
5. **Done:** GitHub environments `development` and `production` exist.
6. **Done:** `main` blocks deletion and non-fast-forward updates. Required PR
   and CI rules are enabled after automation PR creation is verified.

The first production promotion, `v0.1.0`, and public browser smoke test passed
on 2026-08-26.

## Release command

After the selected commit is merged and green on `main`:

```bash
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0
```

Do not move or reuse a published release tag. Roll back by redeploying a prior
accepted commit/tag, not by changing immutable R2 release objects.
