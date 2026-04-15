---
description: Scaffold a new .NET Minimal API endpoint vertical slice (endpoint + service + DTOs + xUnit stub)
argument-hint: <Name> (PascalCase resource, e.g. Loans)
---

# Endpoint

**Name**: $ARGUMENTS

---

Scaffold the full vertical slice for a new Minimal API resource. Before writing, read `.claude/docs/HLD.md` §Repo Layout and §Data Access, and honor every numbered invariant in `.claude/docs/INVARIANTS.md` (especially #2: no repository layer — services take `LmsDbContext` directly).

## Files to create

For each file, create it if missing. If it already exists, report it and propose edits rather than overwriting.

- `src/Lms.Api/Endpoints/<Name>Endpoints.cs` — route group registration exposing `Map<Name>Endpoints(this IEndpointRouteBuilder)`.
- `src/Lms.Api/Services/<Name>Service.cs` — business logic; constructor-injected `LmsDbContext`.
- `src/Lms.Api/Dtos/<Name>Request.cs` — request DTO.
- `src/Lms.Api/Dtos/<Name>Response.cs` — response DTO.
- `tests/Lms.Api.Tests/<Name>ServiceTests.cs` — xUnit + FluentAssertions stub in AAA shape, minimum three tests: happy path, one failure case, one edge case.

## Non-negotiables

- **DTOs are `record` types.** No classes, no mutable props.
- **Service methods are `async Task<T>`** with `CancellationToken` as the **last** parameter.
- **Endpoint handlers use typed results**, e.g. `Results<Ok<T>, NotFound, BadRequest<ProblemDetails>>`.
- **Authorization is required by default.** Apply the authenticated-user policy unless the endpoint is explicitly public — call out and document the default in the route group.
- **No direct `DbContext` access in endpoint handlers.** Every handler delegates to `<Name>Service`.
- **Register the group** in `src/Lms.Api/Program.cs` by calling `app.Map<Name>Endpoints()`.
- **Mirror the folder shape in tests** (`tests/Lms.Api.Tests/...`) per `common/testing.md`.

## After scaffolding

Run the `csharp-reviewer` agent over the new files and let the `tdd-workflow` skill drive the test expansion to the 80% coverage bar.
