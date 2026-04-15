# GitHub Actions Patterns

Conventions for `.github/workflows/deploy.yml` in this LMS project. One workflow, one job, one deploy.

## Single-Workflow Principle

There is exactly one workflow: `deploy.yml`. It builds, migrates, and deploys in a single job. Do not split into separate build/test/deploy workflows until there is a concrete reason (e.g. a test suite worth caching, a parallelizable matrix). Premature splitting costs more CI minutes and adds coordination failure modes.

## Trigger

```yaml
on:
  push:
    branches: [main]
```

Push to `main` only. No `pull_request` trigger — PR builds double free-tier CI usage without adding signal for a solo take-home. No `workflow_dispatch` unless manually redeploying becomes a regular need.

## Job Ordering Invariants

The order is load-bearing, not cosmetic:

1. React client build MUST complete before the API publish step, because `client/dist/` is copied into `src/Lms.Api/wwwroot/` and then picked up by `dotnet publish`.
2. `Lms.Migrations` MUST run AFTER publish but BEFORE `azure/webapps-deploy@v3`, so the new schema is live when the new code lands. Reversing this causes a window where the deployed code sees an old schema.

Any new step must preserve both invariants.

## Steps Order Reference

checkout → setup-node 20 → `npm ci` (in `client/`) → `npm run build` → copy `client/dist` to `src/Lms.Api/wwwroot` → setup-dotnet 10 → `dotnet publish src/Lms.Api` → run `Lms.Migrations` against Azure SQL → `azure/webapps-deploy@v3`.

## Caching

Cache by lockfile hash:
- `~/.nuget/packages` keyed on the hash of `**/packages.lock.json` (or `**/*.csproj` if lock files are not committed).
- `node_modules` or the npm cache keyed on `client/package-lock.json`.

Do not cache the `dist/` or `publish/` output directories — cache inputs, not artifacts.

## Secrets Handling

- Reference secrets as `${{ secrets.AZURE_SQL_CONNECTION }}`, `${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}`, etc.
- Never `echo` a secret, never `env | grep`, never `set -x` in a step that touches a secret.
- Never pass secrets as command-line arguments where they would appear in process listings if avoidable — prefer `env:` on the step.
- The `Lms.AppHost` project is dev-only and must never be referenced from the workflow.

## Publish Profile vs. OIDC

The design doc explicitly uses a publish profile fetched from `AZURE_WEBAPP_PUBLISH_PROFILE` — simpler for a demo and avoids the federated-credential setup dance. OIDC (`azure/login@v2` with `id-token: write`) is the documented hardening step, not the starting point. Do not preemptively migrate.

## Fail-Fast

Every step runs with default `continue-on-error: false`. In particular, a migration failure MUST abort the deploy — never mark the migration step as `continue-on-error: true` to "unblock" a broken schema push.

## Runner

`ubuntu-latest`. No Windows runners — slower, more expensive in minutes, and nothing in this stack requires them.

## Not Here

No background jobs. No matrix strategies. No reusable workflows. No composite actions. This is a single linear pipeline; resist the urge to generalize it.
