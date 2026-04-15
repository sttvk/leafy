# Architecture Invariants

These are load-bearing decisions. Don't revisit without updating `HLD.md`. When the team lead dispatches a worker, applicable invariants are named by **number** in the dispatch brief so the worker can look them up here.

1. **Migrations never run at API startup.** They run in the `Lms.Migrations` console project — via Aspire `WaitForCompletion` locally, as a GitHub Actions step in prod. The `pre-edit-migration-detector` hook enforces this at tool-call time for any file under `src/Lms.Api/`.

2. ~~**No repository layer.** Services take `LmsDbContext` directly. Repository abstractions add indirection without payoff at this scale.~~ **RETIRED 2026-04-15.** Superseded by #9. The project now uses a repository pattern with layered projects. Rationale: the dependency-arrow discipline is worth the indirection cost, invariant #3's atomic CAS has a natural home in `ICheckoutRepository.TryCheckoutAsync`, and the Clean Architecture shape is easier to review than a folder-layered monolith. Historical dispatch briefs that reference `#2` should be read as "no repository layer at the time of writing"; current work follows #9.

3. **Checkout is an atomic compare-and-set.** A single `UPDATE Books SET AvailableCopies = AvailableCopies - 1 WHERE Id = @id AND AvailableCopies > 0`. Zero rows affected → 409 Conflict. The `CK_Books_Copies` CHECK constraint is the backstop, not the primary mechanism. Do not replace with read-then-write + rowversion.

4. **Loan status is computed, not stored.** `ReturnedAt IS NULL && DueAt < now` = overdue. Never add a `Status` column to `Checkouts`.

5. **Semantic search is in-memory cosine over ~100 rows.** No `pgvector`, no Azure AI Search, no vector DB. Embeddings are stored as `VARBINARY` in `BookEmbeddings`, with `ModelName` + `Dimensions` recorded explicitly so model changes can be detected and trigger re-embedding.

6. **Same codebase, same config keys** locally and in prod. Only the *source* of `IConfiguration` differs (user secrets vs. App Service Configuration). Don't fork config shapes.

7. **One App Service hosts both React and API.** The React build is copied into `src/Lms.Api/wwwroot` by the CI job and served from there. Splitting into two App Services breaks the free-tier budget.

8. **`Lms.AppHost` is dev-only.** Never built, never deployed — it exists purely to orchestrate local services via .NET Aspire. App code must not reference `Aspire.*` packages.

9. **Layered project dependencies.** The solution splits into four projects with one-way dependency arrows: `Lms.Domain ← Lms.Application ← Lms.Infrastructure ← Lms.Api`. Inner projects NEVER reference outer projects. Entities and repository interfaces (`IBookRepository`, `IUserRepository`, `ICheckoutRepository`) live in `Lms.Domain`. Use-case services live in `Lms.Application`. `LmsDbContext`, fluent configurations, and concrete repository implementations live in `Lms.Infrastructure`. Minimal API endpoints and DI composition live in `Lms.Api`. Enforced at the MSBuild project-reference level — a reverse or circular reference is a build error, not a style nit.

## How invariants are enforced

| Invariant | Enforcement mechanism |
|---|---|
| #1 migrations out-of-band | `pre-edit-migration-detector.sh` hook blocks `.Database.Migrate()` writes in `src/Lms.Api/**` |
| #3 checkout CAS | `sql-server-patterns.md` documents the pattern; the atomic `UPDATE` lives in `ICheckoutRepository.TryCheckoutAsync` (#9); code review enforces |
| #5 in-memory cosine | `hybrid-search-tuning` skill + architecture review |
| #8 AppHost dev-only | `aspire.md` rules file + deploy workflow excludes AppHost from publish |
| #9 layered project deps | MSBuild project-reference graph — a reverse reference is a compile error |
| others | code review + design doc cross-references |

## When to amend this file

- A new load-bearing decision emerges from a design discussion → add a new numbered entry
- An existing invariant is relaxed (rare; requires explicit user approval) → mark as "retired" rather than deleting, so historical dispatch briefs referencing `#N` remain interpretable
