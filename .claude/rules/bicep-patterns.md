# Bicep Patterns

Conventions for authoring `azure/main.bicep` in this LMS project. The target is a single resource group with ~8 resources, free-tier only.

## Target Scope

Always scope at the resource group:

```bicep
targetScope = 'resourceGroup'
```

Never use `subscription` scope. This project has exactly one RG and the deployment command is `az deployment group create`.

## Parameter Conventions

- Every `param` gets an `@description` decorator.
- Use `@allowed([...])` to pin SKUs that must not drift (e.g. App Service Plan SKU).
- Mark passwords, API keys, and connection strings with `@secure()`.
- No default values for environment-specific settings (SQL admin login, location if multi-region matters). Fail loudly at deploy time instead of silently defaulting.
- Safe defaults are allowed for truly invariant values (e.g. `param location string = resourceGroup().location`).

## Resource Naming

- Consistent prefix: `lms-`.
- Environment suffix where relevant (`lms-api-prod`, `lms-sql-prod`).
- Never hardcode a literal resource name inside the file body. Build it from `param name string` or `${prefix}-${env}-${kind}`.

## Free Tier Enforcement

Pin free SKUs directly in the file, not as parameters:

- App Service Plan: `F1` Linux.
- Azure SQL Database: `Free` offering SKU.
- Application Insights: workspace-based on the Log Analytics workspace (first 1 GB free).

Hardcoding these in the resource block means a careless `--parameters` override cannot silently upgrade a resource into a paid tier. If an upgrade is ever intentional, it must be a visible code change.

## Bicep vs. Manual

In Bicep: App Service Plan, App Service, Azure SQL Server, SQL Database, SQL firewall rule (allow Azure services), Azure OpenAI account + `text-embedding-3-small` deployment, Application Insights, Log Analytics workspace.

Deliberately NOT in Bicep (documented in README):
- Microsoft Entra app registration — tenant-scoped, one-time manual.
- GitHub repository secrets — one-time manual.

Do not attempt to drag either into the template.

## Module Organization

Keep everything in `main.bicep`. At ~8 resources the cognitive cost of module indirection outweighs any reuse benefit. Only split into modules when there is a second consumer or the file crosses ~300 lines.

## Outputs

Emit:
- App Service default hostname.
- SQL Server FQDN and database name (connection string is assembled at deploy time with the password injected from a GitHub secret — never output the full credential string).
- Application Insights connection string.

Consumers: the GitHub Actions workflow and the README "after deploy" section.

## What-If Before Deploy

Always run `az deployment group what-if` before `az deployment group create`. The project README documents this as the standard flow. Reviewing the what-if output is part of the deploy ritual, not optional.

## Idempotency

Every resource declaration must be safely re-runnable. No `newGuid()` defaults, no `utcNow()` in resource names, no imperative side effects. Re-running `main.bicep` against an existing RG must be a no-op unless something actually changed.
