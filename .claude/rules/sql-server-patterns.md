# SQL Server Patterns

Conventions for the LMS database. Target engines are SQL Server 2025 (local container, Aspire-managed) and Azure SQL Database Free (production). Data access is EF Core with the SqlServer provider.

## Azure SQL Free Quirks

- The Free offering auto-pauses after idle. The first query of the day pays a cold-start tap. Design retries and user-facing loading states to tolerate it — do not treat a single timeout as fatal.
- Hard limits: 32 GB storage, 100k vCore-seconds/month. Queries must be bounded and scans avoided on hot paths.
- No SQL Agent, no `sp_configure` tuning, no linked servers. Do not propose anything that requires them.
- Assume the connection string uses SQL auth in both environments.

## Primary Keys

- `UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID()`. This is the project convention for every table.
- Do not use `INT IDENTITY` unless there is a measured, specific reason.
- Do not use `NEWSEQUENTIALID()` unless index fragmentation has actually been measured and is a problem. Unpredictable PKs are fine at this scale.

## Timestamps

- `DATETIME2` always. Never `DATETIME`, never `SMALLDATETIME`.
- Default is `SYSUTCDATETIME()`. Never `GETDATE()` or `GETUTCDATE()`.
- Store UTC. Convert at the edge.

## String Types

- `NVARCHAR` always. Never `VARCHAR` for user-visible content. The one exception is `Isbn VARCHAR(20)` because ISBNs are ASCII by definition.
- Specify an explicit length. `NVARCHAR(MAX)` only when the content genuinely needs it (e.g. `Books.Description`).
- `VARBINARY(MAX)` is allowed for the embedding `Vector` column — it holds raw float bytes.

## Check Constraints

Use CHECK constraints as invariant backstops, not as business rules. Business rules live in services; the constraint is the backstop if anything races. The load-bearing example in this repo:

```sql
CONSTRAINT CK_Books_Copies CHECK (AvailableCopies >= 0 AND AvailableCopies <= TotalCopies)
```

## Indexes

Create indexes for actual query predicates, not defensively. Every index is a write cost. The `IX_Checkouts_Borrower` index on `(BorrowerUserId, CheckedOutAt DESC)` exists because the "My Checkouts" page sorts by it — not because it felt safe.

## Soft Delete

Books use `IsDeleted BIT NOT NULL DEFAULT 0`. Register a global query filter in EF Core so every non-admin query hides deleted rows automatically. Do not scatter `.Where(b => !b.IsDeleted)` across services.

## Concurrency: Compare-and-Set

Checkout availability is load-bearing. The only correct implementation is a single atomic `UPDATE` with a predicate:

```sql
UPDATE Books
SET AvailableCopies = AvailableCopies - 1
WHERE Id = @id AND AvailableCopies > 0;
```

Then check rows affected. Zero rows means the book is unavailable — return HTTP 409. The CHECK constraint is the backstop if anything else ever races. Do not replace this pattern with an EF read-then-write, do not add a rowversion token, do not add application-level locking.

## Things Not To Do

- No stored procedures, no triggers, no views, no `MERGE`, no `OUTPUT` clauses, no dynamic SQL. All logic lives in C#.
- No table-valued functions or scalar UDFs.
- No full-text indexes. Plain `LIKE` is fine for ~100 books.
- Do not run migrations at API startup. That is the `Lms.Migrations` project's job.

## Postgres-isms To Reject

If a suggestion includes any of the following, stop and translate to the SQL Server equivalent first:

- `JSONB` → store the shape as typed columns, or `NVARCHAR(MAX)` if absolutely needed.
- `ILIKE` → `LIKE` with a case-insensitive collation (SQL Server default is already CI).
- `RETURNING` clause → do a separate `SELECT`, or use EF Core's generated value tracking.
- `CREATE EXTENSION`, `pgvector`, array columns, `UUID` type.
- Use `UNIQUEIDENTIFIER`, not `UUID`.
- Use `NEWID()`, not `gen_random_uuid()`.
