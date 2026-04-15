# Mini Library Management System — Functional Requirements

This document captures the functional requirements for a Mini Library Management System. The application will be built with a React frontend, a .NET 10 Minimal API backend, and deployed to Azure. Requirements are grouped by priority (Must-Have / Should-Have / Bonus) so scope can be adjusted against the 2+ day time budget. This is an intermediate brainstorming artifact — it captures functional requirements only, and does not address architecture or implementation details.

## Must-Have (Core Assignment)

### FR-1: Book Management
- FR-1.1: User can add a book with metadata (title, author, ISBN, genre, publication year, total copies, description)
- FR-1.2: User can edit any book field
- FR-1.3: User can delete a book (soft delete — preserves loan history)
- FR-1.4: User can view a paginated list of all books
- FR-1.5: User can view a single book's detail page (metadata, current availability, loan history)

### FR-2: Check-out / Check-in (Loans)
- FR-2.1: User can check out a book (marks a copy as borrowed, records borrower and due date)
- FR-2.2: User can check in (return) a borrowed book
- FR-2.3: System prevents checkout when no copies are available
- FR-2.4: System tracks loan status (active, returned, overdue) and due dates

### FR-3: Search & Browse
- FR-3.1: Full-text search across title, author, ISBN, description
- FR-3.2: Filter by genre, availability, publication year range
- FR-3.3: Sort by title, author, recently added, popularity (borrow count)

## Should-Have (Polish & Quality)

### FR-4: Dashboard
- FR-4.1: Homepage shows stats (total books, active loans, overdue count, recent activity feed)

### FR-5: User-Friendly UX
- FR-5.1: Form validation with helpful error messages
- FR-5.2: Toast notifications for actions (success / error)
- FR-5.3: Loading / empty / error states on every view

## Bonus (Differentiation)

### FR-6: Authentication & Roles
- FR-6.1: Users sign in via Microsoft / Google SSO (Azure Entra External ID or Azure AD B2C)
- FR-6.2: Two roles: **Librarian** (full CRUD on books, manage all loans) and **Member** (browse catalogue, borrow/return own books)
- FR-6.3: Members see a "My Loans" page with active and past borrows

### FR-7: AI Features
- FR-7.1: Natural-language semantic search ("cozy mystery set in Paris") powered by embeddings
- FR-7.2: Auto-fill on add — paste ISBN or title, LLM fetches/generates metadata and description
- FR-7.3: Personalized recommendations based on borrow history

### FR-8: Deployment
- FR-8.1: Live URL on Azure (App Service or Container Apps + Azure SQL or Postgres)
- FR-8.2: CI/CD via GitHub Actions

## Non-Functional Requirements (placeholder)

Non-functional requirements — performance, security, accessibility, and observability — will be captured in the design spec once these functional requirements are approved.

## Open Questions

- Which bonus features will be implemented? (recommendation: FR-6 SSO + one of FR-7.1/FR-7.2 + FR-8 Deploy)
- Which database: Azure SQL vs PostgreSQL?
- Single-tenant or multi-tenant?
