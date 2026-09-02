# Cloudflare data publisher runbook

## Environment map

| Environment | Worker | Cron (UTC) | State | R2 target | Code release |
| --- | --- | --- | --- | --- | --- |
| Development | `oss-knowledge-base-data-dev` | `7 * * * *` | environment-local Durable Object | `oss-knowledge-base-dev` | push to `main` |
| Production | `oss-knowledge-base-data-prod` | `37 * * * *` | environment-local Durable Object | `oss-knowledge-base-prod` | reachable `vX.Y.Z` tag |

The Workers require the Standard (paid) Workers limits. Each environment needs
two Worker secrets:

- `GITHUB_SOURCE_TOKEN`: fine-grained GitHub token with read-only access to
  public repository metadata;
- `MANUAL_TRIGGER_TOKEN`: random bearer token for `POST /run`.

Do not put either value in Wrangler configuration, Git, logs, or Pages.

## Health and manual run

`GET /health` returns only the environment, whether a run is active, and the
last bounded status. It never returns credentials or event payloads.

An authorized manual run calls `POST /run` with
`Authorization: Bearer <MANUAL_TRIGGER_TOKEN>`. Use it once after initial secret
provisioning, then confirm Feed and Search both changed to complete releases
before relying on the Cron.

## Failure and rollback

- A GitHub error, incomplete page sequence, validation error, or R2 error keeps
  the previous complete pointers readable.
- HTTP 409 from a manual run means the serialized environment-local run is
  already active; do not start another retry.
- To hold a rollback, pause the affected Cron first. Verify every immutable
  object for the chosen release, restore its Feed/Search pointers, and only then
  re-enable the Cron.
- Never copy checkpoints or Durable Object state between development and
  production.
