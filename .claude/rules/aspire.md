# Aspire Conventions

.NET Aspire is the local dev orchestrator for the LMS project. It is dev-only scaffolding. Production runs the same app code unchanged on Azure App Service with no Aspire in the loop.

## Aspire Is Dev-Only

- `Lms.AppHost` is never built in CI and never deployed. It exists to start the full stack on a developer machine with one command.
- App code (`Lms.Api`, `Lms.Migrations`) must be runnable with nothing but `IConfiguration` and DI. If it needs Aspire to function, it is wrong.

## No Aspire Client SDKs In App Code

- `Lms.Api` and `Lms.Migrations` must NOT reference any `Aspire.*` client package. No `Aspire.Microsoft.EntityFrameworkCore.SqlServer`, no service-discovery clients, nothing.
- They read plain connection strings and URLs from `IConfiguration`. Aspire's job is to write those values into environment variables before starting the process — nothing more.

## Service Discovery By Logical Name Is Banned

- Do not call `"http://api"` or any logical-name URL from app code.
- Configuration provides a real URL (e.g. `ApiBaseUrl` env var). Aspire populates it at launch; App Service sets it in Configuration. The app code never knows the difference.

## AppHost Responsibilities

Allowed only inside `Lms.AppHost`:

- Start the SQL Server 2025 container with a persistent named volume.
- Run `Lms.Migrations` as a one-shot with `WaitForCompletion` so `Lms.Api` cannot boot until the schema is current.
- Start `Lms.Api` with a dependency on migrations completing.
- Start the Vite dev server for `client/`.
- Wire OTEL exporters to the Aspire Dashboard.

No business logic, no seeding, no HTTP clients. If it is not orchestration, it does not belong here.

## ServiceDefaults

- `Lms.ServiceDefaults` owns OTEL setup, health check registration, and resilience defaults (retry, circuit breaker, timeout).
- Both `Lms.Api` and `Lms.Migrations` reference it.
- Nothing Aspire-specific lives here. It is plain MEL/OTEL/health-check helpers that are equally valid in App Service. The name is historical; do not add Aspire coupling.

## Persistent SQL Volume

The SQL container must use a named Docker volume so data survives `Ctrl+C` and machine reboots. Losing the dev catalog on every restart is a dev-flow killer. The volume name is part of the AppHost code, not ad-hoc.

## One Command To Run Everything

`dotnet run --project src/Lms.AppHost` must boot the full stack: SQL container, migrations, API, client, dashboard. No manual `docker compose up`, no "open a second terminal and run npm", no README step that says "first start the database". If it breaks, fix the AppHost.

## Dashboard

The Aspire Dashboard URL is printed on startup and surfaces logs, traces, and metrics for every service Aspire manages. Any "how do I debug X locally?" answer should route through the dashboard first.

## Docker Desktop

Explicit prerequisite. Aspire cannot start the SQL container without it. README must list it in the prereqs section and the troubleshooting section.
