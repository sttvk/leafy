#!/usr/bin/env bash
# ============================================================================
# Leafy — One-command Azure deployment
# Usage: ./deploy.sh
#
# Required environment variables (set before running):
#   SQL_ADMIN_PASSWORD
#   GOOGLE_CLIENT_ID
#   GOOGLE_CLIENT_SECRET
#   STRIPE_SECRET_KEY
#   STRIPE_PUB_KEY
#   GEMINI_API_KEY
#
# Or create a .env file (gitignored) with these values.
# ============================================================================
set -euo pipefail

APP_NAME="leafy"
RESOURCE_GROUP="rg-${APP_NAME}-prod"
SQL_ADMIN_LOGIN="leafyadmin"
REGIONS=("centralus" "westus2" "eastus2" "northeurope" "westeurope" "southeastasia")

# Load from .env if it exists
if [ -f .env ]; then
  echo "Loading secrets from .env..."
  set -a
  source .env
  set +a
fi

# Validate required secrets
MISSING=()
[ -z "${SQL_ADMIN_PASSWORD:-}" ] && MISSING+=("SQL_ADMIN_PASSWORD")
[ -z "${GOOGLE_CLIENT_ID:-}" ] && MISSING+=("GOOGLE_CLIENT_ID")
[ -z "${GOOGLE_CLIENT_SECRET:-}" ] && MISSING+=("GOOGLE_CLIENT_SECRET")
[ -z "${STRIPE_SECRET_KEY:-}" ] && MISSING+=("STRIPE_SECRET_KEY")
[ -z "${STRIPE_PUB_KEY:-}" ] && MISSING+=("STRIPE_PUB_KEY")
[ -z "${GEMINI_API_KEY:-}" ] && MISSING+=("GEMINI_API_KEY")

if [ ${#MISSING[@]} -gt 0 ]; then
  echo "ERROR: Missing required environment variables:"
  for VAR in "${MISSING[@]}"; do
    echo "  - $VAR"
  done
  echo ""
  echo "Set them via environment variables or create a .env file:"
  echo ""
  echo "  cat > .env << 'EOF'"
  echo "  SQL_ADMIN_PASSWORD=YourStr0ngPass!"
  echo "  GOOGLE_CLIENT_ID=your-google-client-id"
  echo "  GOOGLE_CLIENT_SECRET=your-google-secret"
  echo "  STRIPE_SECRET_KEY=sk_test_..."
  echo "  STRIPE_PUB_KEY=pk_test_..."
  echo "  GEMINI_API_KEY=AIza..."
  echo "  EOF"
  exit 1
fi

JWT_KEY=$(openssl rand -base64 32 | tr -d '/')

echo "=========================================="
echo "  Leafy — Azure Deployment"
echo "=========================================="

# Step 1: Check az login
echo ""
echo "[1/6] Checking Azure CLI login..."
if ! az account show &>/dev/null; then
  echo "  Not logged in. Running az login..."
  az login
fi
echo "  Logged in to: $(az account show --query name -o tsv)"

# Step 2: Find available region
echo ""
echo "[2/6] Finding available region..."
SELECTED_REGION=""
for REGION in "${REGIONS[@]}"; do
  echo "  Trying $REGION..."
  if az group create --name "$RESOURCE_GROUP" --location "$REGION" -o none 2>/dev/null; then
    SELECTED_REGION="$REGION"
    echo "  Using region: $REGION"
    break
  fi
done
[ -z "$SELECTED_REGION" ] && echo "ERROR: No region available" && exit 1

# Step 3: Deploy Bicep infrastructure
echo ""
echo "[3/6] Deploying infrastructure (~3 min)..."
PARAMS_FILE=$(mktemp)
cat > "$PARAMS_FILE" << EOF
{
  "sqlAdminLogin":{"value":"$SQL_ADMIN_LOGIN"},
  "sqlAdminPassword":{"value":"$SQL_ADMIN_PASSWORD"},
  "jwtKey":{"value":"$JWT_KEY"},
  "googleClientId":{"value":"$GOOGLE_CLIENT_ID"},
  "googleClientSecret":{"value":"$GOOGLE_CLIENT_SECRET"},
  "stripeSecretKey":{"value":"$STRIPE_SECRET_KEY"},
  "geminiApiKey":{"value":"$GEMINI_API_KEY"}
}
EOF

DEPLOY_SUCCESS=false
for REGION in "${REGIONS[@]}"; do
  if [ "$REGION" != "$SELECTED_REGION" ]; then
    az group delete --name "$RESOURCE_GROUP" --yes --no-wait 2>/dev/null || true
    sleep 5
    az group create --name "$RESOURCE_GROUP" --location "$REGION" -o none 2>/dev/null || continue
    SELECTED_REGION="$REGION"
  fi

  echo "  Deploying to $REGION..."
  if az deployment group create \
    --resource-group "$RESOURCE_GROUP" \
    --template-file azure/main.bicep \
    --parameters @"$PARAMS_FILE" \
    -o none 2>/dev/null; then
    DEPLOY_SUCCESS=true
    echo "  Infrastructure deployed in $REGION"
    break
  fi
  echo "  $REGION failed, trying next..."
done
rm -f "$PARAMS_FILE"
[ "$DEPLOY_SUCCESS" = false ] && echo "ERROR: Deployment failed in all regions" && exit 1

# Get outputs
SQL_FQDN=$(az deployment group show --resource-group "$RESOURCE_GROUP" --name main --query "properties.outputs.sqlServerFqdn.value" -o tsv 2>/dev/null || echo "${APP_NAME}-sql.database.windows.net")
SQL_DB=$(az deployment group show --resource-group "$RESOURCE_GROUP" --name main --query "properties.outputs.sqlDatabaseName.value" -o tsv 2>/dev/null || echo "${APP_NAME}-db")
APP_HOSTNAME=$(az deployment group show --resource-group "$RESOURCE_GROUP" --name main --query "properties.outputs.appServiceHostname.value" -o tsv 2>/dev/null || echo "${APP_NAME}-api.azurewebsites.net")
SQL_CONNECTION="Server=tcp:${SQL_FQDN},1433;Database=${SQL_DB};User ID=${SQL_ADMIN_LOGIN};Password=${SQL_ADMIN_PASSWORD};Encrypt=true;TrustServerCertificate=false;"

# Step 4: Build the app
echo ""
echo "[4/6] Building application..."
echo "  Building React client..."
(cd client && npm ci --silent && VITE_GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" VITE_STRIPE_PUBLISHABLE_KEY="$STRIPE_PUB_KEY" npm run build)

rm -rf src/Lms.Api/wwwroot
cp -r client/dist src/Lms.Api/wwwroot

echo "  Publishing .NET API..."
dotnet publish src/Lms.Api -c Release -o ./publish --nologo -v q

# Step 5: Run migrations
echo ""
echo "[5/6] Running migrations & seeding..."
ConnectionStrings__LmsDatabase="$SQL_CONNECTION" Gemini__ApiKey="$GEMINI_API_KEY" dotnet run --project src/Lms.Migrations 2>&1 | grep -E "^info:|^warn:" | tail -10 || true

# Step 6: Deploy to App Service
echo ""
echo "[6/6] Deploying to App Service..."
(cd publish && zip -r -q ../deploy.zip .)
az webapp deploy --resource-group "$RESOURCE_GROUP" --name "${APP_NAME}-api" --src-path deploy.zip --type zip --async true 2>/dev/null
rm -f deploy.zip

echo ""
echo "=========================================="
echo "  Deployment Complete!"
echo "=========================================="
echo ""
echo "  URL:    https://${APP_HOSTNAME}"
echo "  Region: ${SELECTED_REGION}"
echo "  Admin:  admin@leafy.com / Admin@123"
echo ""
echo "  Next: Add https://${APP_HOSTNAME} to Google OAuth origins"
echo "=========================================="
