targetScope = 'resourceGroup'

// ---------------------------------------------------------------------------
// Parameters
// ---------------------------------------------------------------------------

@description('Azure region for all resources. Defaults to the resource group location.')
param location string = resourceGroup().location

@description('SQL Server administrator login name.')
param sqlAdminLogin string

@secure()
@description('SQL Server administrator password.')
param sqlAdminPassword string

@description('Application name prefix used for all resource names.')
param appName string = 'leafy'

@secure()
@description('JWT signing key for authentication.')
param jwtKey string

@secure()
@description('Google OAuth client ID.')
param googleClientId string

@secure()
@description('Google OAuth client secret.')
param googleClientSecret string

@secure()
@description('Stripe secret API key.')
param stripeSecretKey string

@secure()
@description('Gemini API key.')
param geminiApiKey string

// ---------------------------------------------------------------------------
// App Service Plan — F1 Free, Linux
// ---------------------------------------------------------------------------

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: '${appName}-plan'
  location: location
  kind: 'linux'
  sku: {
    name: 'F1'
    tier: 'Free'
  }
  properties: {
    reserved: true
  }
}

// ---------------------------------------------------------------------------
// App Service — .NET 10, Linux
// ---------------------------------------------------------------------------

resource app 'Microsoft.Web/sites@2023-12-01' = {
  name: '${appName}'
  location: location
  properties: {
    serverFarmId: plan.id
    siteConfig: {
      linuxFxVersion: 'DOTNETCORE|10.0'
      alwaysOn: false // F1 does not support alwaysOn
      appSettings: [
        { name: 'Authentication__Jwt__Key', value: jwtKey }
        { name: 'Authentication__Google__ClientId', value: googleClientId }
        { name: 'Authentication__Google__ClientSecret', value: googleClientSecret }
        { name: 'Stripe__SecretKey', value: stripeSecretKey }
        { name: 'Gemini__ApiKey', value: geminiApiKey }
        { name: 'ConnectionStrings__LmsDatabase', value: 'Server=tcp:${sqlServer.properties.fullyQualifiedDomainName},1433;Database=${sqlDb.name};User ID=${sqlAdminLogin};Password=${sqlAdminPassword};Encrypt=true;TrustServerCertificate=false;' }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsights.properties.ConnectionString }
      ]
    }
  }
}

// ---------------------------------------------------------------------------
// Azure SQL Server
// ---------------------------------------------------------------------------

resource sqlServer 'Microsoft.Sql/servers@2023-08-01-preview' = {
  name: '${appName}-sql'
  location: location
  properties: {
    administratorLogin: sqlAdminLogin
    administratorLoginPassword: sqlAdminPassword
  }
}

// ---------------------------------------------------------------------------
// Azure SQL Database — Free offering
// ---------------------------------------------------------------------------

resource sqlDb 'Microsoft.Sql/servers/databases@2023-08-01-preview' = {
  parent: sqlServer
  name: '${appName}-db'
  location: location
  sku: {
    name: 'GP_S_Gen5_1'
    tier: 'GeneralPurpose'
  }
  properties: {
    useFreeLimit: true
    freeLimitExhaustionBehavior: 'AutoPause'
  }
}

// ---------------------------------------------------------------------------
// SQL Firewall Rule — allow Azure services
// ---------------------------------------------------------------------------

resource sqlFirewall 'Microsoft.Sql/servers/firewallRules@2023-08-01-preview' = {
  parent: sqlServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// ---------------------------------------------------------------------------
// Log Analytics Workspace
// ---------------------------------------------------------------------------

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${appName}-logs'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
  }
}

// ---------------------------------------------------------------------------
// Application Insights — workspace-based
// ---------------------------------------------------------------------------

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${appName}-insights'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

@description('Default hostname of the App Service.')
output appServiceHostname string = app.properties.defaultHostName

@description('Fully qualified domain name of the SQL Server.')
output sqlServerFqdn string = sqlServer.properties.fullyQualifiedDomainName

@description('Name of the SQL database.')
output sqlDatabaseName string = sqlDb.name

@description('Application Insights connection string.')
output appInsightsConnectionString string = appInsights.properties.ConnectionString
