---
name: api-contract-sync
description: Use when .NET DTOs or Minimal API endpoints change, to regenerate the TypeScript client from OpenAPI and prevent frontend-backend drift.
---

# API contract sync

## When to use

- A DTO record in the .NET API is added, renamed, or has a property changed.
- A Minimal API endpoint is added, removed, or its route/verb/return type changes.
- A pull request touches both `api/` and `web/` — confirm the generated client is current.
- CI reports "generated client is stale."

## Why it matters

DTOs are the source of truth (see `.claude/docs/HLD.md`). The React client consumes them through a generated TypeScript file — not hand-written fetch calls. Drift between the two sides shows up as runtime 400s or undefined properties, which no type checker can catch without an up-to-date generated client.

## Procedure

1. Edit the DTO or endpoint in the `api/` project. Keep DTOs as `record` types in `api/Dtos/`.
2. Export the OpenAPI document: `dotnet run --project api -- --export-openapi ./openapi.json`. The API wires this via `Microsoft.AspNetCore.OpenApi` (built into .NET 10) with `builder.Services.AddOpenApi()` and `app.MapOpenApi()`, plus a CLI switch that writes the document and exits.
3. In `web/`, regenerate the client: `npx openapi-typescript ../openapi.json -o src/api/generated.ts`.
4. Commit both `openapi.json` and `src/api/generated.ts` in the same commit as the DTO change.
5. CI runs the export and the generator and fails the build if `git diff --exit-code` shows either file is stale. The check lives in `.github/workflows/ci.yml` (or the chosen runner).

## Usage in React

```ts
import type { components } from './api/generated';
type Book = components['schemas']['BookDto'];
```

All typed fetches go through a thin wrapper that pulls `paths` from the generated file — never hand-write URLs or request bodies.

## Failure modes

- Editing the DTO but forgetting to regenerate — frontend builds with a stale type and crashes at runtime when a property is missing.
- Hand-writing fetch calls that bypass the generated client — types silently diverge.
- Committing `generated.ts` without committing `openapi.json`, or vice versa — CI passes locally, fails on the next unrelated PR.
- Renaming a DTO in a way that is source-compatible in .NET but breaks the JSON schema (e.g., adding `[JsonPropertyName]`) without regenerating.

## References

- https://learn.microsoft.com/en-us/aspnet/core/fundamentals/openapi/aspnetcore-openapi
- https://github.com/openapi-ts/openapi-typescript
