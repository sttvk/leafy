# Leafy — Digital Book Rental Platform

A full-stack digital library where users browse, rent, and read books online.

**Live:** [leafy.azurewebsites.net](https://leafy.azurewebsites.net)

**Admin credentials:** `admin@leafy.com` / `Admin@123` (use these to add, edit, and delete books)

**Test payment card:** `4242 4242 4242 4242` | Expiry: any future date | CVC: any 3 digits

## Features

- **Book Catalog** - Card grid with Add, Edit and Delete options for the Librarian account.
- **Rental System** - Users can checkin/checkout books (Rent/Return system using Stripe payments).
- **Catalog Filtering** - Filter based on Genre.

## Bonus Features

- **Semantic Search** — Natural language queries using Gemini embeddings + keyword search with Reciprocal Rank Fusion
- **Google OAuth** — Sign in with Google alongside email/password auth
- **AI Descriptions** — Each book gets a Gemini-generated description with typewriter animation
- **Early Return Credits** — Return within 7 days to earn credits; 5 credits = 1 free rental
- **Role-Based Access** — Librarian (CRUD catalog) and Member (browse, rent, read)
- **Book Reader** — Server-gated paginated reader with 300 pages per book
- **Dark Mode** — Theme toggle with warm parchment aesthetic

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Tailwind CSS 4, Radix UI, TanStack Query |
| Backend | .NET 10, ASP.NET Core MVC, EF Core, ASP.NET Core Identity |
| Database | Azure SQL Free / SQL Server 2025 |
| AI | Google Gemini (embeddings + text generation) |
| Payments | Stripe Checkout |
| Auth | JWT + Google OAuth |
| Hosting | Azure App Service (F1 free) |
| IaC | Bicep |
| CI/CD | GitHub Actions |
| Local Dev | .NET Aspire |

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for local SQL Server via Aspire)
- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) (for deployment)

## Quick Start

### 1. Clone and configure

```bash
git clone <repo-url>
cd lms
```

Create a `.env` file at the project root:

```
SQL_ADMIN_PASSWORD=YourStr0ngPass!
GOOGLE_CLIENT_SECRET=your-google-client-secret
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
GEMINI_API_KEY=your-gemini-api-key
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
```

### 2. Install frontend dependencies

```bash
cd client && npm install && cd ..
```

### 3. Run with Aspire

```bash
dotnet run --project src/Lms.AppHost
```

This starts everything: SQL Server container, database migrations, API, and Vite dev server.

Open the Aspire Dashboard URL printed in the terminal to see all services.

### 4. Access the app

- **App:** URL printed by Aspire (typically `http://localhost:5173`)
- **Admin login:** `admin@leafy.com` / `Admin@123`
- **Dashboard:** Aspire Dashboard URL for logs, traces, metrics

## Project Structure

```
src/
  Lms.Api/              Controllers, Program.cs, static file serving
  Lms.Application/      Services, DTOs, search, auth logic
  Lms.Domain/           Entities, repository interfaces
  Lms.Infrastructure/   EF Core, repositories, Gemini client
  Lms.Migrations/       Migration runner, seeder, embedding generation
  Lms.AppHost/          Aspire orchestrator (dev-only)

client/
  src/
    api/                API client functions
    components/         Header, UI primitives, shared components
    contexts/           Auth + Cart state
    lib/                Utils, validation, messages, dates
    pages/              Catalog, Auth, Reader, Checkout
    types/              TypeScript types

azure/
  main.bicep            Infrastructure as Code (all Azure resources)

.github/
  workflows/
    deploy.yml          CI/CD pipeline (build, migrate, deploy)
```

## Architecture

```
Lms.Api (Presentation)
  └── Lms.Application (Business Logic)
        └── Lms.Domain (Core - no dependencies)
  └── Lms.Infrastructure (Data Access)
        └── Lms.Domain
```

See [HLD.md](.claude/docs/HLD.md) for detailed architecture diagrams.

## Deployment

### Infrastructure (one-time)

```bash
az group create --name rg-leafy-prod --location centralus
az deployment group create \
  --resource-group rg-leafy-prod \
  --template-file azure/main.bicep \
  --parameters @params.json
```

All resources are free tier ($0/month): App Service F1, Azure SQL Free, Application Insights.

### CI/CD (automatic)

Push to `main` triggers GitHub Actions which builds, migrates, and deploys automatically.

```bash
git push origin main
```

See [DEPLOYMENT.md](.claude/docs/DEPLOYMENT.md) for full deployment guide.

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | - | Register with email/password |
| POST | `/api/auth/login` | - | Login with email/password |
| POST | `/api/auth/google` | - | Login with Google ID token |
| GET | `/api/auth/me` | Yes | Get current user profile |
| GET | `/api/books` | - | List books (paginated) |
| GET | `/api/books/{id}` | - | Get book detail |
| GET | `/api/books/search?q=` | - | Hybrid search (keyword + semantic) |
| GET | `/api/books/{id}/description` | Yes | AI-generated description |
| GET | `/api/books/{id}/content?page=` | Yes | Read book page (checkout required) |
| POST | `/api/books` | Librarian | Add book |
| PUT | `/api/books/{id}` | Librarian | Update book |
| DELETE | `/api/books/{id}` | Librarian | Delete book |
| POST | `/api/books/{id}/checkout` | Yes | Checkout a book |
| POST | `/api/checkouts/{id}/return` | Yes | Return a book |
| GET | `/api/checkouts/mine` | Yes | User's checkouts |
| POST | `/api/checkout/create-session` | Yes | Create Stripe session |
| POST | `/api/checkout/verify-session` | Yes | Verify payment |
