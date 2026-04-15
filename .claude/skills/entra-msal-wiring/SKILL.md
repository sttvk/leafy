---
name: entra-msal-wiring
description: Use when implementing, debugging, or modifying Microsoft Entra ID authentication across the React frontend and .NET Minimal API, including MSAL config, token acquisition, and API authorization policies.
---

# Entra ID + MSAL wiring

## When to use

- Adding login, logout, or a protected route to the React app.
- Adding `[Authorize]` or a new scope requirement to a .NET endpoint.
- Debugging 401s or `AADSTS65001` consent errors at runtime.
- Registering a new scope in the Entra app registration.

## Why it matters

The LMS is a single-tenant app with one Entra registration exposing scopes consumed by one SPA and one API. Audience and scope mismatches are the single most common auth failure, and they produce opaque error messages. Getting the wiring right once avoids hours of guessing.

## Procedure

1. In `web/src/auth/msalConfig.ts`, build a `PublicClientApplication` with `authority: https://login.microsoftonline.com/<tenantId>`, `clientId` of the SPA registration, and `redirectUri` set to the app's origin. Wrap the app in `<MsalProvider instance={pca}>`.
2. Use `loginRedirect` (not `loginPopup`) — popups break in Safari and cost no UX since the app is behind auth anyway.
3. Before every API call, call `instance.acquireTokenSilent({ scopes: ['api://<api-app-id>/Library.Access'], account })`. Catch `InteractionRequiredAuthError` and fall back to `acquireTokenRedirect`.
4. On the .NET side in `Program.cs`: `builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddMicrosoftIdentityWebApi(builder.Configuration.GetSection("AzureAd"));`. Set `AzureAd:Audience` to `api://<api-app-id>` and `AzureAd:TenantId` to the single tenant.
5. Map scopes to policies: `options.AddPolicy("LibraryAccess", p => p.RequireClaim("scp", "Library.Access"));`. Apply with `.RequireAuthorization("LibraryAccess")` on endpoint groups.
6. Verify the SPA requests the exact scope string the API validates. Audience in the token (`aud` claim) must equal `AzureAd:Audience` in config.

## Config snippets

```json
"AzureAd": {
  "Instance": "https://login.microsoftonline.com/",
  "TenantId": "<guid>",
  "ClientId": "<api-app-id>",
  "Audience": "api://<api-app-id>"
}
```

## Failure modes

- SPA requests `User.Read` (Graph scope) instead of the API scope — token has wrong audience, API returns 401.
- API config sets `Audience` to the client ID without the `api://` prefix — validation fails silently.
- Forgetting to expose the scope in the Entra app registration before requesting it — `AADSTS650053`.
- Using `loginPopup` in Safari with third-party cookies blocked — popup closes immediately with no token.

## References

- https://learn.microsoft.com/en-us/entra/identity-platform/scenario-spa-overview
- https://learn.microsoft.com/en-us/entra/msal/dotnet/
- https://github.com/AzureAD/microsoft-identity-web
