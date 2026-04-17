using System.Security.Claims;
using Lms.Application.Checkouts;
using Lms.Domain.Repositories;
using Microsoft.AspNetCore.Http.HttpResults;
using Stripe;
using Stripe.Checkout;

namespace Lms.Api.Endpoints;

public static class StripeEndpoints
{
    private const int RentalPriceInCents = 199;

    public static RouteGroupBuilder MapStripeEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/checkout")
            .WithTags("Stripe")
            .RequireAuthorization();

        group.MapPost("/create-session", CreateSessionAsync)
            .WithName("CreateCheckoutSession");

        group.MapPost("/verify-session", VerifySessionAsync)
            .WithName("VerifyCheckoutSession");

        return group;
    }

    private static async Task<Results<Ok<CreateSessionResponse>, BadRequest<string>, Conflict<string>, UnauthorizedHttpResult>> CreateSessionAsync(
        CreateSessionRequest request,
        ClaimsPrincipal user,
        ICheckoutRepository checkoutRepository,
        IBookRepository bookRepository,
        IConfiguration configuration,
        ILogger<Program> logger,
        CancellationToken ct)
    {
        var userId = ExtractUserId(user);
        if (userId is null)
        {
            return TypedResults.Unauthorized();
        }

        if (request.BookIds is null || request.BookIds.Count == 0)
        {
            return TypedResults.BadRequest("At least one book ID is required.");
        }

        foreach (var bookId in request.BookIds)
        {
            var alreadyCheckedOut = await checkoutRepository.HasActiveCheckoutForBookAsync(bookId, userId.Value, ct);
            if (alreadyCheckedOut)
            {
                return TypedResults.Conflict($"You already have book {bookId} checked out.");
            }
        }

        var lineItems = new List<SessionLineItemOptions>();
        foreach (var bookId in request.BookIds)
        {
            var book = await bookRepository.GetByIdAsync(bookId, ct);
            var title = book?.Title ?? "Unknown Book";

            lineItems.Add(new SessionLineItemOptions
            {
                PriceData = new SessionLineItemPriceDataOptions
                {
                    Currency = "usd",
                    UnitAmount = RentalPriceInCents,
                    ProductData = new SessionLineItemPriceDataProductDataOptions
                    {
                        Name = title,
                    },
                },
                Quantity = 1,
            });
        }

        StripeConfiguration.ApiKey = configuration["Stripe:SecretKey"];

        var options = new SessionCreateOptions
        {
            PaymentMethodTypes = new List<string> { "card" },
            LineItems = lineItems,
            Mode = "payment",
            SuccessUrl = request.SuccessUrl + "?session_id={CHECKOUT_SESSION_ID}",
            CancelUrl = request.CancelUrl,
            Metadata = new Dictionary<string, string>
            {
                ["userId"] = userId.Value.ToString(),
                ["bookIds"] = string.Join(",", request.BookIds),
            },
        };

        var service = new SessionService();
        var session = await service.CreateAsync(options, cancellationToken: ct);

        logger.LogInformation(
            "stripe.session_created user {UserId} books {BookCount}",
            userId.Value,
            request.BookIds.Count);

        return TypedResults.Ok(new CreateSessionResponse(session.Url));
    }

    private static async Task<Results<Ok<IReadOnlyList<CheckoutDto>>, BadRequest<string>, UnauthorizedHttpResult>> VerifySessionAsync(
        VerifySessionRequest request,
        ClaimsPrincipal user,
        Lms.Application.Checkouts.CheckoutService checkoutService,
        IConfiguration configuration,
        ILogger<Program> logger,
        CancellationToken ct)
    {
        var userId = ExtractUserId(user);
        if (userId is null)
        {
            return TypedResults.Unauthorized();
        }

        if (string.IsNullOrWhiteSpace(request.SessionId))
        {
            return TypedResults.BadRequest("Session ID is required.");
        }

        StripeConfiguration.ApiKey = configuration["Stripe:SecretKey"];

        var service = new SessionService();
        var session = await service.GetAsync(request.SessionId, cancellationToken: ct);

        if (session.PaymentStatus != "paid")
        {
            return TypedResults.BadRequest("Payment has not been completed.");
        }

        if (!session.Metadata.TryGetValue("userId", out var sessionUserId)
            || !Guid.TryParse(sessionUserId, out var parsedSessionUserId)
            || parsedSessionUserId != userId.Value)
        {
            return TypedResults.BadRequest("Session does not belong to the authenticated user.");
        }

        if (!session.Metadata.TryGetValue("bookIds", out var bookIdsStr)
            || string.IsNullOrWhiteSpace(bookIdsStr))
        {
            return TypedResults.BadRequest("Session metadata is missing book IDs.");
        }

        var bookIds = bookIdsStr
            .Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(id => Guid.TryParse(id.Trim(), out var parsed) ? parsed : (Guid?)null)
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .ToList();

        var checkouts = new List<CheckoutDto>();
        foreach (var bookId in bookIds)
        {
            var result = await checkoutService.CheckoutAsync(bookId, userId.Value, ct);
            if (result.IsSuccess && result.Checkout is not null)
            {
                checkouts.Add(result.Checkout);
            }
            else
            {
                logger.LogWarning(
                    "stripe.verify_checkout_failed book {BookId} user {UserId} error {Error}",
                    bookId,
                    userId.Value,
                    result.Error);
            }
        }

        logger.LogInformation(
            "stripe.session_verified user {UserId} checkouts {CheckoutCount}",
            userId.Value,
            checkouts.Count);

        IReadOnlyList<CheckoutDto> readOnlyCheckouts = checkouts.AsReadOnly();
        return TypedResults.Ok(readOnlyCheckouts);
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

public sealed record CreateSessionRequest(
    IReadOnlyList<Guid> BookIds,
    string SuccessUrl,
    string CancelUrl);

public sealed record CreateSessionResponse(string SessionUrl);

public sealed record VerifySessionRequest(string SessionId);
