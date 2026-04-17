using System.Security.Claims;
using Lms.Application.Checkouts;
using Lms.Domain.Entities;
using Lms.Domain.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
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
    private const int EarlyReturnsForFreeRental = 5;

    private readonly Lms.Application.Checkouts.CheckoutService _checkoutService;
    private readonly IBookRepository _bookRepository;
    private readonly ICheckoutRepository _checkoutRepository;
    private readonly UserManager<User> _userManager;
    private readonly ILogger<StripeController> _logger;

    public StripeController(
        Lms.Application.Checkouts.CheckoutService checkoutService,
        IBookRepository bookRepository,
        ICheckoutRepository checkoutRepository,
        UserManager<User> userManager,
        ILogger<StripeController> logger)
    {
        _checkoutService = checkoutService;
        _bookRepository = bookRepository;
        _checkoutRepository = checkoutRepository;
        _userManager = userManager;
        _logger = logger;
    }

    [HttpPost("create-session")]
    public async Task<ActionResult<CreateSessionResponse>> CreateSession(
        CreateSessionRequest request,
        CancellationToken ct)
    {
        var userId = User.ExtractUserId();
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

        var user = await _userManager.FindByIdAsync(userId.Value.ToString());
        var hasFreeCredit = user is not null && user.EarlyReturns >= EarlyReturnsForFreeRental;
        var paidCount = hasFreeCredit ? request.BookIds.Count - 1 : request.BookIds.Count;
        var freeBookCount = hasFreeCredit ? 1 : 0;

        if (paidCount <= 0)
        {
            // Deduct credits first — fail fast if the user no longer qualifies
            user!.EarlyReturns -= EarlyReturnsForFreeRental;
            var updateResult = await _userManager.UpdateAsync(user);
            if (!updateResult.Succeeded)
            {
                return Conflict("Failed to redeem free-rental credits. Please try again.");
            }

            // Credits are committed; now create checkouts
            var freeCheckouts = new List<CheckoutDto>();
            foreach (var bookId in request.BookIds)
            {
                var result = await _checkoutService.CheckoutAsync(bookId, userId.Value, ct);
                if (result.IsSuccess && result.Checkout is not null)
                {
                    freeCheckouts.Add(result.Checkout);
                }
                else
                {
                    _logger.LogWarning(
                        "free_rental.checkout_failed book {BookId} user {UserId} error {Error}",
                        bookId,
                        userId.Value,
                        result.Error);
                }
            }

            // If no checkouts succeeded, refund the credits
            if (freeCheckouts.Count == 0)
            {
                user.EarlyReturns += EarlyReturnsForFreeRental;
                await _userManager.UpdateAsync(user);

                _logger.LogWarning(
                    "free_rental.refunded_credits user {UserId} reason no_successful_checkouts",
                    userId.Value);

                return Conflict("No books could be checked out. Credits have been refunded.");
            }

            _logger.LogInformation(
                "free_rental.applied user {UserId} books {BookCount} remaining_credits {RemainingCredits}",
                userId.Value,
                freeCheckouts.Count,
                user.EarlyReturns);

            return Ok(new CreateSessionResponse(null, true, freeBookCount, freeCheckouts.AsReadOnly()));
        }

        // Build line items for paid books only (skip the first book when free credit applies)
        var lineItems = new List<SessionLineItemOptions>();
        for (var i = 0; i < request.BookIds.Count; i++)
        {
            if (hasFreeCredit && i == 0)
            {
                continue;
            }

            var book = await _bookRepository.GetByIdAsync(request.BookIds[i], ct);
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

        var metadata = new Dictionary<string, string>
        {
            ["userId"] = userId.Value.ToString(),
            ["bookIds"] = string.Join(",", request.BookIds),
        };

        if (hasFreeCredit)
        {
            metadata["freeBookId"] = request.BookIds[0].ToString();
        }

        var options = new SessionCreateOptions
        {
            PaymentMethodTypes = new List<string> { "card" },
            LineItems = lineItems,
            Mode = "payment",
            SuccessUrl = request.SuccessUrl + "?session_id={CHECKOUT_SESSION_ID}",
            CancelUrl = request.CancelUrl,
            Metadata = metadata,
        };

        var service = new SessionService();
        var session = await service.CreateAsync(options, cancellationToken: ct);

        _logger.LogInformation(
            "stripe.session_created user {UserId} books {BookCount} free {FreeBookCount}",
            userId.Value,
            request.BookIds.Count,
            freeBookCount);

        return Ok(new CreateSessionResponse(session.Url, false, freeBookCount, null));
    }

    [HttpPost("verify-session")]
    public async Task<ActionResult<IReadOnlyList<CheckoutDto>>> VerifySession(
        VerifySessionRequest request,
        CancellationToken ct)
    {
        var userId = User.ExtractUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        if (string.IsNullOrWhiteSpace(request.SessionId))
        {
            return BadRequest("Session ID is required.");
        }

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

        // Deduct free credit BEFORE creating checkouts to prevent race conditions
        Guid? freeBookId = null;
        var creditsDeducted = false;
        if (session.Metadata.TryGetValue("freeBookId", out var freeBookIdStr)
            && Guid.TryParse(freeBookIdStr, out var parsedFreeBookId))
        {
            freeBookId = parsedFreeBookId;
            var user = await _userManager.FindByIdAsync(userId.Value.ToString());
            if (user is not null && user.EarlyReturns >= EarlyReturnsForFreeRental)
            {
                user.EarlyReturns -= EarlyReturnsForFreeRental;
                var updateResult = await _userManager.UpdateAsync(user);
                creditsDeducted = updateResult.Succeeded;

                if (creditsDeducted)
                {
                    _logger.LogInformation(
                        "free_rental.applied_with_paid user {UserId} free_book {FreeBookId} remaining_credits {RemainingCredits}",
                        userId.Value,
                        freeBookIdStr,
                        user.EarlyReturns);
                }
                else
                {
                    _logger.LogWarning(
                        "free_rental.credit_deduction_failed user {UserId} free_book {FreeBookId}",
                        userId.Value,
                        freeBookIdStr);
                }
            }
            else
            {
                _logger.LogWarning(
                    "free_rental.insufficient_credits user {UserId} free_book {FreeBookId}",
                    userId.Value,
                    freeBookIdStr);
            }
        }

        var checkouts = new List<CheckoutDto>();
        foreach (var bookId in bookIds)
        {
            // Skip the free book if credit deduction failed
            if (freeBookId.HasValue && bookId == freeBookId.Value && !creditsDeducted)
            {
                _logger.LogWarning(
                    "stripe.skipping_free_book book {BookId} user {UserId} reason credits_not_deducted",
                    bookId,
                    userId.Value);
                continue;
            }

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
}

public sealed record CreateSessionRequest(
    IReadOnlyList<Guid> BookIds,
    string SuccessUrl,
    string CancelUrl);

public sealed record CreateSessionResponse(
    string? SessionUrl,
    bool IsFree,
    int FreeBookCount,
    IReadOnlyList<CheckoutDto>? Checkouts);

public sealed record VerifySessionRequest(string SessionId);
