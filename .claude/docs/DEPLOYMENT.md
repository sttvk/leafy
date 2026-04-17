# Deployment Guide — Leafy

## Prerequisites

- Azure CLI (`az`) installed and logged in (`az login`)
- GitHub repo with the code pushed
- .NET 10 SDK
- Node.js 20+

## Step 1: Deploy Azure Infrastructure (one-time)

Create the resource group:

```bash
az group create --name rg-leafy-prod --location eastus
```

Deploy all resources via Bicep (single command):

```bash
az deployment group create \
  --resource-group rg-leafy-prod \
  --template-file azure/main.bicep \
  --parameters \
    sqlAdminLogin=leafyadmin \
    sqlAdminPassword='<CHOOSE_A_STRONG_PASSWORD>' \
    jwtKey="$(openssl rand -base64 32)" \
    googleClientId='<YOUR_GOOGLE_CLIENT_ID>' \
    googleClientSecret='<YOUR_GOOGLE_CLIENT_SECRET>' \
    stripeSecretKey='<YOUR_STRIPE_TEST_SECRET_KEY>' \
    geminiApiKey='<YOUR_GEMINI_API_KEY>'
```

This creates (all free tier, $0/month):

| Resource | SKU |
|----------|-----|
| App Service Plan | F1 (free, Linux) |
| App Service | .NET 10 |
| Azure SQL Server + Database | Free offering (auto-pause) |
| Log Analytics Workspace | 1 GB free |
| Application Insights | Workspace-based |

All app settings (JWT, Google, Stripe, Gemini, SQL connection) are configured automatically via Bicep parameters.

Save the deployment outputs:

```bash
az deployment group show \
  --resource-group rg-leafy-prod \
  --name main \
  --query properties.outputs
```

## Step 2: Configure GitHub for CI/CD (one-time)

### Get the publish profile

```bash
az webapp deployment list-publishing-profiles \
  --name leafy-api \
  --resource-group rg-leafy-prod \
  --xml
```

Copy the entire XML output.

### Get the SQL connection string

Construct from deployment outputs:

```
Server=tcp:<SQL_FQDN>,1433;Database=leafy-db;User ID=leafyadmin;Password=<YOUR_SQL_PASSWORD>;Encrypt=true;TrustServerCertificate=false;
```

### Set GitHub Secrets

Go to your GitHub repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret Name | Value |
|-------------|-------|
| `AZURE_WEBAPP_PUBLISH_PROFILE` | The XML from publish profile |
| `AZURE_SQL_CONNECTION` | The SQL connection string |
| `GEMINI_API_KEY` | Your Gemini API key |

### Set GitHub Variables

Go to Variables tab → New repository variable:

| Variable Name | Value |
|---------------|-------|
| `VITE_GOOGLE_CLIENT_ID` | Your Google OAuth client ID |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Your Stripe publishable key (pk_test_...) |

## Step 3: Update Google OAuth (one-time)

In [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → your OAuth client:

Add the production URL to:
- **Authorized JavaScript origins**: `https://leafy-api.azurewebsites.net`
- **Authorized redirect URIs**: `https://leafy-api.azurewebsites.net`

## Step 4: Deploy

Push to main — GitHub Actions handles everything:

```bash
git push origin main
```

The workflow automatically:
1. Builds the React client with production env vars
2. Copies `client/dist/` into `src/Lms.Api/wwwroot/`
3. Publishes the .NET API
4. Runs migrations against Azure SQL (schema + seed data + embeddings)
5. Deploys to Azure App Service

## Subsequent Deploys

Just push to main. No manual steps:

```bash
git push origin main
```

## Verify

After deploy, visit: `https://leafy-api.azurewebsites.net`

- Admin login: `admin@leafy.com` / `Admin@123`
- First deploy takes longer (~3 min for embedding generation)

## Troubleshooting

### App Service logs

```bash
az webapp log tail --name leafy-api --resource-group rg-leafy-prod
```

### Azure SQL cold start

The free tier auto-pauses after idle. The first request after a pause takes 30-60 seconds. This is expected.

### Rebuild from scratch

```bash
az group delete --name rg-leafy-prod --yes
az group create --name rg-leafy-prod --location eastus
# Re-run Step 1
```

## Cost Summary

| Service | Monthly Cost |
|---------|-------------|
| App Service (F1) | $0 |
| Azure SQL (Free) | $0 |
| Application Insights (1 GB) | $0 |
| Gemini API (embeddings) | $0 (free tier) |
| Stripe (test mode) | $0 |
| **Total** | **$0** |
