# Release workflow

Status: Proposed; local workflow implemented, external bootstrap pending  
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

## One-time bootstrap

External bootstrap state:

1. **Done:** Pages project `oss-knowledge-base-dev` uses production branch
   `main`.
2. **Done:** Pages project `oss-knowledge-base` uses production branch
   `production`.
3. **Pending first deployment:** bind both projects' `OSS_KB_BUCKET` to the existing private
   `oss-knowledge-base-poc` R2 bucket.
4. **Partial:** `CLOUDFLARE_ACCOUNT_ID` exists; add a scoped
   `CLOUDFLARE_API_TOKEN` repository secret.
5. **Done:** GitHub environments `development` and `production` exist.
6. **Pending:** commit the target architecture, run CI once, then protect `main` with its
   exact required check names.

`main` is not protected. The legacy workflow still deploys `viewer/` until its
deletion is committed. Neither new Pages project has a first deployment yet.

## Release command

After the selected commit is merged and green on `main`:

```bash
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0
```

Do not move or reuse a published release tag. Roll back by redeploying a prior
accepted commit/tag, not by changing immutable R2 release objects.
