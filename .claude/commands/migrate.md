---
description: Safely generate an EF Core migration against Lms.Api and review it before apply
argument-hint: <MigrationName> (PascalCase, e.g. AddLoanIndex)
---

# Migrate

**Name**: $ARGUMENTS

---

## Step 1 — Generate

Run exactly:

```bash
dotnet ef migrations add $ARGUMENTS \
  --project src/Lms.Api \
  --startup-project src/Lms.Api \
  --output-dir Data/Migrations
```

## Step 2 — Review the generated files

Open every `.cs` file produced under `src/Lms.Api/Data/Migrations/` and read them in full. Check for:

- Unintended **column drops** or table drops.
- Any operation that causes **data loss** (type narrowing, NOT NULL added without default, etc.).
- Missing **indexes** on new foreign keys or frequently-queried columns.
- Whether **seed data** needs to be updated in `Lms.Migrations` or a data-fix migration.
- Whether the migration touches `Books.AvailableCopies` or the `CK_Books_Copies` check constraint — **these are load-bearing for the atomic checkout compare-and-set in `CLAUDE.md` Architecture Invariant 3. STOP and escalate before modifying either.**

Report findings as a short bulleted list with severity (CRITICAL / HIGH / MEDIUM / LOW).

## Step 3 — Apply (user runs this locally)

Remind the user to apply the migration via the dedicated runner, never the API:

```bash
dotnet run --project src/Lms.Migrations
```

## Invariant (DO NOT VIOLATE)

> **Migrations never run at API startup.** They run in the `Lms.Migrations` console project — via Aspire `WaitForCompletion` locally, as a GitHub Actions step in prod.
> — `.claude/docs/INVARIANTS.md` #1

Under no circumstances modify `src/Lms.Api/Program.cs` to call `.Database.Migrate()`, `.EnsureCreated()`, or any equivalent. If a reviewer asks for it, refuse and link this invariant.
