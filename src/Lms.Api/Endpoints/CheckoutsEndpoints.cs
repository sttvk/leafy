using System.Security.Claims;
using Lms.Application.Checkouts;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Lms.Api.Endpoints;

public static class CheckoutsEndpoints
{
    public static RouteGroupBuilder MapCheckoutsEndpoints(this WebApplication app)
    {
        var checkouts = app.MapGroup("/api/checkouts")
            .WithTags("Checkouts")
            .RequireAuthorization();

        checkouts.MapGet("/mine", GetMyCheckoutsAsync)
            .WithName("GetMyCheckouts");

        checkouts.MapGet("/", GetAllActiveCheckoutsAsync)
            .WithName("GetAllActiveCheckouts")
            .RequireAuthorization(p => p.RequireRole("Librarian"));

        checkouts.MapPost("/{id:guid}/return", ReturnAsync)
            .WithName("ReturnCheckout");

        // Checkout is nested under books for RESTful resource semantics
        var books = app.MapGroup("/api/books")
            .WithTags("Checkouts")
            .RequireAuthorization();

        books.MapPost("/{id:guid}/checkout", CheckoutAsync)
            .WithName("CheckoutBook");

        return checkouts;
    }

    private static async Task<Results<Ok<CheckoutDto>, Conflict<string>, UnauthorizedHttpResult>> CheckoutAsync(
        Guid id,
        ClaimsPrincipal user,
        CheckoutService checkoutService,
        CancellationToken ct)
    {
        var userId = ExtractUserId(user);
        if (userId is null)
        {
            return TypedResults.Unauthorized();
        }

        var result = await checkoutService.CheckoutAsync(id, userId.Value, ct);

        if (!result.IsSuccess)
        {
            return TypedResults.Conflict(result.Error!);
        }

        return TypedResults.Ok(result.Checkout!);
    }

    private static async Task<Results<Ok<CheckoutDto>, NotFound, Conflict<string>, UnauthorizedHttpResult>> ReturnAsync(
        Guid id,
        ClaimsPrincipal user,
        CheckoutService checkoutService,
        CancellationToken ct)
    {
        var userId = ExtractUserId(user);
        if (userId is null)
        {
            return TypedResults.Unauthorized();
        }

        var result = await checkoutService.ReturnAsync(id, userId.Value, ct);

        if (!result.IsSuccess)
        {
            return result.FailureReason == CheckoutFailureReason.NotFound
                ? TypedResults.NotFound()
                : TypedResults.Conflict(result.Error!);
        }

        return TypedResults.Ok(result.Checkout!);
    }

    private static async Task<Results<Ok<IReadOnlyList<CheckoutDto>>, UnauthorizedHttpResult>> GetMyCheckoutsAsync(
        ClaimsPrincipal user,
        CheckoutService checkoutService,
        CancellationToken ct)
    {
        var userId = ExtractUserId(user);
        if (userId is null)
        {
            return TypedResults.Unauthorized();
        }

        var checkouts = await checkoutService.GetMyCheckoutsAsync(userId.Value, ct);
        return TypedResults.Ok(checkouts);
    }

    private static async Task<Ok<IReadOnlyList<CheckoutDto>>> GetAllActiveCheckoutsAsync(
        CheckoutService checkoutService,
        CancellationToken ct)
    {
        var checkouts = await checkoutService.GetAllActiveCheckoutsAsync(ct);
        return TypedResults.Ok(checkouts);
    }

    private static Guid? ExtractUserId(ClaimsPrincipal user)
    {
        var userIdClaim = user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? user.FindFirstValue("sub");

        if (userIdClaim is null || !Guid.TryParse(userIdClaim, out var userId))
        {
            return null;
        }

        return userId;
    }
}
