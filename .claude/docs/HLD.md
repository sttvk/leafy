# High-Level Design — Leafy Digital Library

## Architecture Overview

Leafy is a digital book rental platform with AI-powered search, Stripe payments, and role-based access. Single deployment on Azure App Service (free tier).

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Browser     │  │   Mobile     │  │   Any HTTP   │          │
│  │   (React SPA) │  │   Browser    │  │   Client     │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼──────────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AZURE APP SERVICE (F1 Free)                   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    .NET 10 API                              │ │
│  │                                                             │ │
│  │  ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌────────────┐  │ │
│  │  │  Auth   │  │  Books  │  │ Checkout │  │  Stripe    │  │ │
│  │  │Controller│  │Controller│  │Controller│  │ Controller │  │ │
│  │  └────┬────┘  └────┬────┘  └────┬─────┘  └─────┬──────┘  │ │
│  │       │            │            │               │          │ │
│  │  ┌────┴────────────┴────────────┴───────────────┴──────┐  │ │
│  │  │              Application Services                    │  │ │
│  │  │  AuthService │ BookService │ CheckoutService │Search │  │ │
│  │  └────┬────────────┬────────────┬───────────────┬──────┘  │ │
│  │       │            │            │               │          │ │
│  │  ┌────┴────────────┴────────────┴───────────────┴──────┐  │ │
│  │  │              Domain (Entities + Interfaces)          │  │ │
│  │  │  Book │ User │ Checkout │ IBookRepo │ ICheckoutRepo │  │ │
│  │  └────┬────────────┬────────────┬──────────────────────┘  │ │
│  │       │            │            │                          │ │
│  │  ┌────┴────────────┴────────────┴──────────────────────┐  │ │
│  │  │              Infrastructure                          │  │ │
│  │  │  EF Core │ Repositories │ GeminiEmbeddingService    │  │ │
│  │  └──────────────────┬──────────────────────────────────┘  │ │
│  │                     │                                      │ │
│  ├─────────────────────┼──────────────────────────────────────┤ │
│  │  React SPA (wwwroot)│                                      │ │
│  │  Static files served│by UseStaticFiles + MapFallbackToFile │ │
│  └─────────────────────┼──────────────────────────────────────┘ │
└────────────────────────┼────────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Azure SQL   │ │   Gemini AI  │ │    Stripe    │
│  (Free tier) │ │   API        │ │    API       │
│              │ │              │ │              │
│ - Users      │ │ - Embeddings │ │ - Checkout   │
│ - Books      │ │   (search)   │ │   Sessions   │
│ - Checkouts  │ │ - Text Gen   │ │ - Payments   │
│ - Embeddings │ │   (describe) │ │              │
└──────────────┘ └──────────────┘ └──────────────┘
```

## Data Flow

### User Rental Flow
```
User → Browse Catalog → Click Book → View AI Description
     → Add to Cart → Checkout → Stripe Payment
     → Read Book (server-gated content) → Return Book
```

### Search Flow
```
User Query → API
  ├── Keyword Search (SQL LIKE on title, author, genre)
  ├── Semantic Search (Gemini embedding → cosine similarity)
  └── Reciprocal Rank Fusion → Merged Results + AI Summary
```

### Admin Flow
```
Librarian → Login → Add/Edit/Delete Books
         → Book changes trigger embedding regeneration
```

## Layer Architecture

```
┌─────────────────────────┐
│      Lms.Api             │  Controllers, Program.cs, Static files
│      (Presentation)      │  Depends on: Application
├─────────────────────────┤
│      Lms.Application     │  Services, DTOs, Search, Auth
│      (Business Logic)    │  Depends on: Domain
├─────────────────────────┤
│      Lms.Domain          │  Entities, Repository interfaces
│      (Core)              │  No dependencies
├─────────────────────────┤
│      Lms.Infrastructure  │  EF Core, Repositories, Gemini client
│      (Data Access)       │  Depends on: Domain
├─────────────────────────┤
│      Lms.Migrations      │  Schema migrations, Seeder, Embedding gen
│      (Dev/Deploy tool)   │  Depends on: Infrastructure
├─────────────────────────┤
│      Lms.AppHost         │  Aspire orchestrator (dev-only)
│      (Dev tool)          │  Not deployed
└─────────────────────────┘
```

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Tailwind CSS 4, Radix UI, TanStack Query |
| Backend | .NET 10, ASP.NET Core MVC Controllers, EF Core |
| Database | Azure SQL (Free tier) / SQL Server 2025 (local) |
| Auth | ASP.NET Core Identity + JWT + Google OAuth |
| Payments | Stripe Checkout (test mode) |
| AI Search | Gemini embedding-001 + in-memory cosine similarity |
| AI Descriptions | Gemini Flash (text generation) |
| Hosting | Azure App Service F1 (free) |
| CI/CD | GitHub Actions |
| IaC | Bicep |
| Local Dev | .NET Aspire |

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Single App Service hosts API + React | Free tier budget constraint (one F1 instance) |
| In-memory vector search (no vector DB) | ~750 books × 768 dims = 2.3MB — instant cosine similarity |
| JWT with no refresh tokens | 8h expiry, re-login after — acceptable for demo |
| Stripe inline pricing (no pre-created products) | Dynamic catalog, products created per-session |
| Content served via authenticated API | Server-gated reading prevents unauthorized access |
| Early return credit system | Incentivizes returns, 5 credits = 1 free rental |
| Gemini over OpenAI | 1,500 RPM free tier vs 3 RPM on OpenAI free |

## External Integrations

```
┌──────────┐     ┌──────────────────┐     ┌──────────────┐
│  Google  │────▶│  Authentication  │     │   Gemini AI  │
│  OAuth   │     │  (ID token       │     │              │
│          │     │   validation)    │     │  ┌─────────┐ │
└──────────┘     └──────────────────┘     │  │Embedding│ │
                                           │  │ Search  │ │
┌──────────┐     ┌──────────────────┐     │  ├─────────┤ │
│  Stripe  │────▶│  Payments        │     │  │  Text   │ │
│  Checkout│     │  ($1.99/book     │     │  │  Gen    │ │
│          │     │   14-day rental) │     │  └─────────┘ │
└──────────┘     └──────────────────┘     └──────────────┘
```

## Deployment

```
Developer → git push main
              │
              ▼
        GitHub Actions
         ├── npm build (React)
         ├── dotnet publish (.NET)
         ├── Run migrations (Azure SQL)
         └── Deploy to App Service
              │
              ▼
        https://leafy.azurewebsites.net
```

Infrastructure provisioned via Bicep (`azure/main.bicep`) — all free tier, $0/month.
