# Database Schema

## Overview

This doc describes the database for the library management app. The app runs on SQL Server: a local container started by Aspire during development, and the Azure SQL Database Free offering in production. Data access is EF Core with the SqlServer provider.

There are four tables: Books, Users, Checkouts, and BookEmbeddings.

Books have a simple copy counter instead of a separate copies table, because per-copy tracking isn't needed for a demo. BookEmbeddings powers semantic search and is populated from Azure OpenAI's `text-embedding-3-small` model. Everything else is owned by the local database — Open Library is only called to look up book metadata when adding a new book.

## How the Tables Relate

- One **Book** has many **Checkouts** (through `Checkouts.BookId`)
- One **User** has many **Checkouts** (through `Checkouts.BorrowerUserId`)
- One **Book** has zero or one **BookEmbedding** (`BookEmbeddings.BookId` is both PK and FK to `Books`)
- A **Checkout** is the only place Books and Users meet

That's the whole relationship graph. No other foreign keys.

## Tables

### Books

```sql
CREATE TABLE Books (
    Id               UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
    Title            NVARCHAR(500)    NOT NULL,
    Author           NVARCHAR(300)    NOT NULL,
    Isbn             VARCHAR(20)      NULL,
    PublicationYear  INT              NULL,
    Genre            NVARCHAR(100)    NULL,
    Description      NVARCHAR(MAX)    NULL,
    CoverImageUrl    NVARCHAR(1000)   NULL,
    TotalCopies      INT              NOT NULL DEFAULT 1,
    AvailableCopies  INT              NOT NULL DEFAULT 1,
    AddedAt          DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted        BIT              NOT NULL DEFAULT 0,
    CONSTRAINT CK_Books_Copies CHECK (AvailableCopies >= 0 AND AvailableCopies <= TotalCopies)
);

CREATE INDEX IX_Books_Title  ON Books(Title);
CREATE INDEX IX_Books_Author ON Books(Author);
```

The CHECK constraint on `AvailableCopies` is our safety net — even if two checkout requests race, the database won't let us lend out more copies than we have.

Covers FR-1.*, FR-2.3, FR-3.*

### Users

```sql
CREATE TABLE Users (
    Id           UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
    ExternalId   NVARCHAR(200)    NOT NULL UNIQUE,
    Email        NVARCHAR(320)    NOT NULL UNIQUE,
    DisplayName  NVARCHAR(200)    NOT NULL,
    Role         TINYINT          NOT NULL DEFAULT 0,  -- 0 = Member, 1 = Librarian
    CreatedAt    DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME()
);
```

We never store passwords — SSO handles that. `ExternalId` is the stable subject claim from the SSO provider (Entra or Google).

Covers FR-6.1, FR-6.2

### Checkouts

```sql
CREATE TABLE Checkouts (
    Id              UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
    BookId          UNIQUEIDENTIFIER NOT NULL,
    BorrowerUserId  UNIQUEIDENTIFIER NOT NULL,
    CheckedOutAt    DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    DueAt           DATETIME2        NOT NULL,
    ReturnedAt     DATETIME2        NULL,
    CONSTRAINT FK_Checkouts_Books FOREIGN KEY (BookId)         REFERENCES Books(Id),
    CONSTRAINT FK_Checkouts_Users FOREIGN KEY (BorrowerUserId) REFERENCES Users(Id)
);

CREATE INDEX IX_Checkouts_Borrower ON Checkouts(BorrowerUserId, CheckedOutAt DESC);
```

`ReturnedAt IS NULL` means the book is still out. The index on `(BorrowerUserId, CheckedOutAt DESC)` makes the "My Checkouts" page fast.

Covers FR-2.*, FR-4.1, FR-6.3

### BookEmbeddings

```sql
CREATE TABLE BookEmbeddings (
    BookId      UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    Vector      VARBINARY(MAX)   NOT NULL,
    Dimensions  INT              NOT NULL,
    ModelName   NVARCHAR(100)    NOT NULL,
    CreatedAt   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_BookEmbeddings_Books FOREIGN KEY (BookId) REFERENCES Books(Id) ON DELETE CASCADE
);
```

The `Vector` column holds the raw bytes of the float array returned by Azure OpenAI — for `text-embedding-3-small` that's 1536 floats, or 6144 bytes. `Dimensions` and `ModelName` are stored explicitly so that if the embedding model ever changes, the code can detect a mismatch and re-embed instead of comparing incompatible vectors. Cosine similarity is computed in memory at query time, since scanning ~100 rows is trivially fast and avoids any extra infrastructure.

Covers FR-7.1

## How Checkout and Return Work

Checkout happens inside a single EF transaction: we decrement Book.AvailableCopies and insert a Checkout row. The CHECK constraint on AvailableCopies is the safety net if two requests come in at once. Return sets ReturnedAt to now and increments Book.AvailableCopies. Status (Active, Returned, Overdue) is not stored — it's calculated when we query: if ReturnedAt is set it's Returned, if DueAt is in the past it's Overdue, otherwise Active. This avoids a stored status getting out of sync with reality.

## Search

With around 100 books in the demo, we use plain LIKE queries across Title, Author, and Description. No full-text search, no extra indexes beyond what EF gives us. Good enough for the scale.

## Seed Data

- About 10 genres seeded as plain strings (used by the genre filter dropdown)
- About 50-100 books pulled from Open Library (title, author, cover URL, description)
- Two demo users for local dev: one Librarian, one Member
- A handful of historical checkouts so the dashboard looks alive

## Migrations

Schema changes are EF Core migrations, generated with `dotnet ef migrations add`. A dedicated `Lms.Migrations` console project applies them as a one-shot step before the API starts. Locally, Aspire orchestrates this with `WaitForCompletion` so the API doesn't boot until migrations finish. In CI, the GitHub Actions workflow runs the same console project against Azure SQL before the API is deployed. Migrations do not run at API startup.

## Things We Deliberately Left Out

- Audit log table — out of scope for the demo
- Separate BookCopies table — the counter on Books is enough
- Optimistic concurrency tokens on Books — the CHECK constraint covers the only race that matters
- Genre lookup table — plain strings are fine for ten values
- pgvector / Azure AI Search — in-memory cosine similarity is faster than a network round-trip at 100 books; flagged as the production upgrade path
- Dedicated vector database (Pinecone, Qdrant, etc) — same reasoning

## Open Questions

- Should BookEmbeddings be re-generated on every Book edit, or only when Title, Author, or Description change?
- Should Azure OpenAI cold start be hidden with a skeleton UI on the first search of the day?
- Should the seed script pre-compute embeddings so first-run has full search, or generate them lazily?
