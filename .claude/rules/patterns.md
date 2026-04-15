# Common Patterns

## Skeleton Projects

When implementing new functionality:
1. Search for battle-tested skeleton projects
2. Use parallel agents to evaluate options:
   - Security assessment
   - Extensibility analysis
   - Relevance scoring
   - Implementation planning
3. Clone best match as foundation
4. Iterate within proven structure

## Design Patterns

### Repository Pattern

Encapsulate data access behind a consistent interface. In this project the pattern is load-bearing and enforced by invariant #9:

- Interfaces (`IBookRepository`, `IUserRepository`, `ICheckoutRepository`) live in `Lms.Domain` alongside the entities they expose.
- Concrete EF-backed implementations live in `Lms.Infrastructure` and hold the `LmsDbContext` dependency.
- Application services (`Lms.Application`) depend on the interfaces only — never on `LmsDbContext` or any EF type.
- Repository methods model business intent, not CRUD verbs. Canonical example: `ICheckoutRepository.TryCheckoutAsync(bookId, borrowerUserId, dueAt)` performs the atomic CAS from invariant #3 and returns `false` if no copies are available.
- Testing seam: unit-test application services with fake repositories; integration-test repositories against a real SQL Server container.

### API Response Format

Use a consistent envelope for all API responses:
- Include a success/status indicator
- Include the data payload (nullable on error)
- Include an error message field (nullable on success)
- Include metadata for paginated responses (total, page, limit)
