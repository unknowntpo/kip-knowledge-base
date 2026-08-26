# ADR-0008: Promote Pages through main and release tags

- Status: Accepted and active since v0.1.0
- Date: 2026-08-26

## Context

The target Vue application now deploys through two Cloudflare Pages projects.
Before this decision was implemented, the legacy `viewer/` deployment owned
`main`, Cloudflare repository credentials and branch protection were missing,
and the public proof exposed `poc` in its Pages domain.

Several feature branches must be able to run CI independently without changing
a shared public environment. A production deployment must be an explicit
promotion of a commit already accepted on `main`, not a second build with
unknown inputs.

## Decision

- Keep the repository default branch named `main`; do not rename it to
  `master` solely for this workflow.
- Pull requests run typecheck, build, unit, integration, and local-R2 browser
  E2E. They do not deploy a shared Pages environment.
- A push to `main` runs the same checks and deploys the retained CI artifact to
  `oss-knowledge-base-dev.pages.dev` only after every check succeeds.
- A SemVer-style `vX.Y.Z` tag runs the same checks. Production deploys only when
  that tagged commit is reachable from `main`.
- Production receives the retained CI artifact at
  `oss-knowledge-base.pages.dev`; the deploy job does not rebuild it.
- Development deployments cancel an older in-progress deployment. Production
  deployments are serialized and are never cancelled by a newer tag.
- Code deployment never polls GitHub or publishes Feed/Search R2 data. The
  guarded data publishers remain an independent operation.
- During this slice, both Pages projects read the existing private
  `oss-knowledge-base-poc` R2 projection. This is read-only sharing, not an
  environment-isolated processing architecture.
- Delete the legacy `viewer/` Pages deploy workflow when this workflow lands.

## Alternatives considered

### Deploy every branch to the shared development project

Rejected. Parallel feature work would race to replace the same environment.
Pull requests already receive deterministic CI and local browser evidence.
Cloudflare preview deployments can be added later with per-branch isolation.

### Deploy production on every push to main

Rejected. It gives no explicit promotion point and makes rollback/release
history harder to understand.

### Rebuild during each deploy job

Rejected. The deployed bytes could differ from the artifact that passed the
static CI job.

### Rename main to master

Rejected. The name has no bearing on the release invariant and would require
changing repository defaults, branch rules, existing automation, and local
worktrees.

## Consequences

- Two Pages projects and two GitHub environments must be bootstrapped before
  the workflow can merge.
- `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets are
  mandatory; a missing secret fails instead of silently skipping deployment.
- Automation that changes repository data must use a dedicated branch and pull
  request; it must not weaken `main` protection to preserve direct bot pushes.
- Dev and production code are isolated, but their read-only projection data are
  temporarily shared. A separate ADR is required before workflows begin
  publishing environment-specific data automatically.
- Rollback is an explicit redeploy of a previously accepted tag/commit or a
  Cloudflare Pages deployment rollback.

## Revisit when

- pull requests need public preview URLs;
- dev processing must mutate or validate data independently of production;
- a custom production domain replaces `pages.dev`;
- release artifacts include independently deployed processing jobs.
