using System.Security.Claims;
using Lms.Application.Checkouts;
using Lms.Domain.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Stripe;
using Stripe.Checkout;

namespace Lms.Api.Controllers;

[ApiController]
[Route("api/checkout")]
[Authorize]
public sealed class StripeController : ControllerBase
{
    private const int RentalPriceInCents = 199;

    private readonly IConfiguration _configuration;
    private readonly Lms.Application.Checkouts.CheckoutService _checkoutService;
    private readonly IBookRepository _bookRepository;
    private readonly ICheckoutRepository _checkoutRepository;
    private readonly ILogger<StripeController> _logger;

    public StripeController(
        IConfiguration configuration,
        Lms.Application.Checkouts.CheckoutService checkoutService,
        IBookRepository bookRepository,
        ICheckoutRepository checkoutRepository,
        ILogger<StripeController> logger)
    {
        _configuration = configuration;
        _checkoutService = checkoutService;
        _bookRepository = bookRepository;
        _checkoutRepository = checkoutRepository;
        _logger = logger;
    }

    [HttpPost("create-session")]
    public async Task<ActionResult<CreateSessionResponse>> CreateSession(
        CreateSessionRequest request,
        CancellationToken ct)
    {
        var userId = ExtractUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        if (request.BookIds is null || request.BookIds.Count == 0)
        {
            return BadRequest("At least one book ID is required.");
        }

        foreach (var bookId in request.BookIds)
        {
            var alreadyCheckedOut = await _checkoutRepository.HasActiveCheckoutForBookAsync(bookId, userId.Value, ct);
            if (alreadyCheckedOut)
            {
                return Conflict($"You already have book {bookId} checked out.");
            }
        }

        var lineItems = new List<SessionLineItemOptions>();
        foreach (var bookId in request.BookIds)
        {
            var book = await _bookRepository.GetByIdAsync(bookId, ct);
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

        StripeConfiguration.ApiKey = _configuration["Stripe:SecretKey"];

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

        _logger.LogInformation(
            "stripe.session_created user {UserId} books {BookCount}",
            userId.Value,
            request.BookIds.Count);

        return Ok(new CreateSessionResponse(session.Url));
    }

    [HttpPost("verify-session")]
    public async Task<ActionResult<IReadOnlyList<CheckoutDto>>> VerifySession(
        VerifySessionRequest request,
        CancellationToken ct)
    {
        var userId = ExtractUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        if (string.IsNullOrWhiteSpace(request.SessionId))
        {
            return BadRequest("Session ID is required.");
        }

        StripeConfiguration.ApiKey = _configuration["Stripe:SecretKey"];

        var service = new SessionService();
        var session = await service.GetAsync(request.SessionId, cancellationToken: ct);

        if (session.PaymentStatus != "paid")
        {
            return BadRequest("Payment has not been completed.");
        }

        if (!session.Metadata.TryGetValue("userId", out var sessionUserId)
            || !Guid.TryParse(sessionUserId, out var parsedSessionUserId)
            || parsedSessionUserId != userId.Value)
        {
            return BadRequest("Session does not belong to the authenticated user.");
        }

        if (!session.Metadata.TryGetValue("bookIds", out var bookIdsStr)
            || string.IsNullOrWhiteSpace(bookIdsStr))
        {
            return BadRequest("Session metadata is missing book IDs.");
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
            var result = await _checkoutService.CheckoutAsync(bookId, userId.Value, ct);
            if (result.IsSuccess && result.Checkout is not null)
            {
                checkouts.Add(result.Checkout);
            }
            else
            {
                _logger.LogWarning(
                    "stripe.verify_checkout_failed book {BookId} user {UserId} error {Error}",
                    bookId,
                    userId.Value,
                    result.Error);
            }
        }

        _logger.LogInformation(
            "stripe.session_verified user {UserId} checkouts {CheckoutCount}",
            userId.Value,
            checkouts.Count);

        IReadOnlyList<CheckoutDto> readOnlyCheckouts = checkouts.AsReadOnly();
        return Ok(readOnlyCheckouts);
    }

    private Guid? ExtractUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");

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
