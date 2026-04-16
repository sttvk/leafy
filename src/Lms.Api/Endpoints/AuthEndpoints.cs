using System.Security.Claims;
using Lms.Application.Auth;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Lms.Api.Endpoints;

public static class AuthEndpoints
{
    public static RouteGroupBuilder MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth")
            .WithTags("Auth");

        group.MapPost("/register", RegisterAsync)
            .WithName("Register")
            .AllowAnonymous();

        group.MapPost("/login", LoginAsync)
            .WithName("Login")
            .AllowAnonymous();

        group.MapPost("/google", GoogleLoginAsync)
            .WithName("GoogleLogin")
            .AllowAnonymous();

        group.MapGet("/me", GetProfileAsync)
            .WithName("GetProfile")
            .RequireAuthorization();

        return group;
    }

    private static async Task<Results<Created<AuthResponse>, Conflict<string>, ValidationProblem>> RegisterAsync(
        RegisterRequest request,
        AuthService authService)
    {
        var result = await authService.RegisterAsync(request);

        if (result.IsConflict)
        {
            return TypedResults.Conflict(result.Error!);
        }

        if (!result.IsSuccess)
        {
            return TypedResults.ValidationProblem(
                new Dictionary<string, string[]>
                {
                    ["registration"] = [result.Error!]
                });
        }

        return TypedResults.Created("/api/auth/me", result.Response!);
    }

    private static async Task<Results<Ok<AuthResponse>, ValidationProblem>> LoginAsync(
        LoginRequest request,
        AuthService authService)
    {
        var result = await authService.LoginAsync(request);

        if (!result.IsSuccess)
        {
            return TypedResults.ValidationProblem(
                new Dictionary<string, string[]>
                {
                    ["login"] = [result.Error!]
                });
        }

        return TypedResults.Ok(result.Response!);
    }

    private static async Task<Results<Ok<AuthResponse>, ValidationProblem>> GoogleLoginAsync(
        GoogleLoginRequest request,
        AuthService authService)
    {
        var result = await authService.GoogleLoginAsync(request);

        if (!result.IsSuccess)
        {
            return TypedResults.ValidationProblem(
                new Dictionary<string, string[]>
                {
                    ["google"] = [result.Error!]
                });
        }

        return TypedResults.Ok(result.Response!);
    }

    private static async Task<Results<Ok<UserProfileDto>, UnauthorizedHttpResult>> GetProfileAsync(
        ClaimsPrincipal user,
        AuthService authService)
    {
        var userIdClaim = user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? user.FindFirstValue("sub");

        if (userIdClaim is null || !Guid.TryParse(userIdClaim, out var userId))
        {
            return TypedResults.Unauthorized();
        }

        var profile = await authService.GetProfileAsync(userId);
        if (profile is null)
        {
            return TypedResults.Unauthorized();
        }

        return TypedResults.Ok(profile);
    }
}
