# Database Schema — Leafy

Azure SQL (Free tier) / SQL Server 2025 (local). Managed by EF Core with code-first migrations.

## Entity Relationship Diagram

```
┌──────────────────────────┐       ┌──────────────────────────┐
│          Users           │       │          Books           │
├──────────────────────────┤       ├──────────────────────────┤
│ Id           GUID    PK  │       │ Id           GUID    PK  │
│ UserName     NVARCHAR    │       │ Title        NVARCHAR    │
│ Email        NVARCHAR    │       │ Author       NVARCHAR    │
│ PasswordHash NVARCHAR    │       │ Isbn         VARCHAR(20) │
│ DisplayName  NVARCHAR    │       │ PublicationYear INT      │
│ Role         TINYINT     │       │ Genre        NVARCHAR    │
│ EarlyReturns INT         │       │ Description  NVARCHAR(MAX)│
│ CreatedAt    DATETIME2   │       │ CoverImageUrl NVARCHAR   │
│ EmailConfirmed BIT       │       │ AddedAt      DATETIME2   │
│ SecurityStamp NVARCHAR   │       │ IsDeleted    BIT         │
│ ...Identity columns...   │       └─────────────┬────────────┘
└─────────────┬────────────┘                     │
              │                                  │
              │ BorrowerUserId                   │ BookId
              │                                  │
              ▼                                  ▼
┌──────────────────────────────────────────────────┐
│                   Checkouts                       │
├──────────────────────────────────────────────────┤
│ Id              GUID        PK                    │
│ BookId          GUID        FK → Books.Id         │
│ BorrowerUserId  GUID        FK → Users.Id         │
│ CheckedOutAt    DATETIME2   DEFAULT SYSUTCDATETIME │
│ DueAt           DATETIME2                          │
│ ReturnedAt      DATETIME2   NULLABLE               │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│                BookEmbeddings                     │
├──────────────────────────────────────────────────┤
│ BookId          GUID        PK, FK → Books.Id     │
│ Vector          VARBINARY(MAX)                     │
│ Dimensions      INT                                │
│ ModelName       NVARCHAR                           │
│ CreatedAt       DATETIME2                          │
└──────────────────────────────────────────────────┘

           ASP.NET Core Identity Tables
┌────────────────────┐  ┌────────────────────────┐
│   AspNetRoles      │  │  AspNetUserRoles       │
│   AspNetRoleClaims │  │  AspNetUserClaims      │
│                    │  │  AspNetUserLogins      │
│                    │  │  AspNetUserTokens      │
└────────────────────┘  └────────────────────────┘
```

## Tables

### Books

Digital books in the library catalog.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| Id | UNIQUEIDENTIFIER | PK, DEFAULT NEWID() | |
| Title | NVARCHAR(256) | NOT NULL | |
| Author | NVARCHAR(256) | NOT NULL | |
| Isbn | VARCHAR(20) | NULLABLE | ASCII-only |
| PublicationYear | INT | NULLABLE | |
| Genre | NVARCHAR(100) | NULLABLE | Title Case normalized on save |
| Description | NVARCHAR(MAX) | NULLABLE | |
| CoverImageUrl | NVARCHAR(2048) | NULLABLE | |
| AddedAt | DATETIME2 | NOT NULL, DEFAULT SYSUTCDATETIME() | UTC |
| IsDeleted | BIT | NOT NULL, DEFAULT 0 | Soft delete, global query filter |

### Users

Extends ASP.NET Core Identity's `IdentityUser<Guid>`.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| Id | UNIQUEIDENTIFIER | PK, DEFAULT NEWID() | |
| Email | NVARCHAR(256) | NOT NULL, UNIQUE | |
| DisplayName | NVARCHAR(256) | NOT NULL | |
| Role | TINYINT | NOT NULL, DEFAULT 0 | 0 = Member, 1 = Librarian |
| EarlyReturns | INT | NOT NULL, DEFAULT 0 | 5 credits = 1 free rental |
| CreatedAt | DATETIME2 | NOT NULL | UTC |
| + standard Identity columns | | | PasswordHash, SecurityStamp, etc. |

### Checkouts

Book rental records. Status is **computed, never stored** (invariant #4).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| Id | UNIQUEIDENTIFIER | PK, DEFAULT NEWID() | |
| BookId | UNIQUEIDENTIFIER | NOT NULL, FK → Books.Id | |
| BorrowerUserId | UNIQUEIDENTIFIER | NOT NULL, FK → Users.Id | |
| CheckedOutAt | DATETIME2 | NOT NULL, DEFAULT SYSUTCDATETIME() | UTC |
| DueAt | DATETIME2 | NOT NULL | CheckedOutAt + 14 days |
| ReturnedAt | DATETIME2 | NULLABLE | NULL = active, SET = returned |

**Computed status:**
- `ReturnedAt IS NULL AND DueAt > NOW` → **Active**
- `ReturnedAt IS NULL AND DueAt <= NOW` → **Overdue** (content access denied)
- `ReturnedAt IS NOT NULL` → **Returned**

### BookEmbeddings

Vector embeddings for semantic search.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| BookId | UNIQUEIDENTIFIER | PK, FK → Books.Id | One embedding per book |
| Vector | VARBINARY(MAX) | NOT NULL | 768 floats × 4 bytes = ~3KB |
| Dimensions | INT | NOT NULL | 768 for gemini-embedding-001 |
| ModelName | NVARCHAR(100) | NOT NULL | "gemini-embedding-001" |
| CreatedAt | DATETIME2 | NOT NULL | Regenerated on book edit |

## Indexes

| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| IX_Checkouts_Borrower | Checkouts | (BorrowerUserId, CheckedOutAt DESC) | My Checkouts query |

## Migrations

| Migration | Description |
|-----------|-------------|
| InitialCreate | Books, Checkouts, BookEmbeddings tables |
| AddIdentity | ASP.NET Identity tables + User custom columns |
| RemoveBookCopies | Drop TotalCopies, AvailableCopies (digital library) |
| AddEarlyReturns | Add EarlyReturns column to Users |

## Seed Data

- **750 books** with covers, genres, descriptions
- **1 admin account** (`admin@leafy.com` / `Admin@123`, Librarian role)
- **Embeddings** generated via Gemini API on first run

## Conventions

- All PKs: `UNIQUEIDENTIFIER DEFAULT NEWID()`
- All timestamps: `DATETIME2` in UTC
- All user-visible strings: `NVARCHAR` (except ISBN)
- Soft delete on Books with EF global query filter
- No stored procedures, triggers, or views
