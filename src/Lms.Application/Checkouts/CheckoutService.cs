using Lms.Domain.Entities;
using Lms.Domain.Repositories;
using Microsoft.Extensions.Logging;

namespace Lms.Application.Checkouts;

public sealed class CheckoutService
{
    private const int LoanPeriodDays = 14;
    private const int MaxActiveCheckouts = 3;

    private readonly ICheckoutRepository _checkouts;
    private readonly IBookRepository _books;
    private readonly ILogger<CheckoutService> _logger;

    public CheckoutService(
        ICheckoutRepository checkouts,
        IBookRepository books,
        ILogger<CheckoutService> logger)
    {
        _checkouts = checkouts;
        _books = books;
        _logger = logger;
    }

    public async Task<CheckoutResult> CheckoutAsync(
        Guid bookId, Guid userId, CancellationToken ct)
    {
        var activeCount = await _checkouts.CountActiveByBorrowerAsync(userId, ct);
        if (activeCount >= MaxActiveCheckouts)
        {
            _logger.LogInformation(
                "checkout.limit_reached user {UserId} active {ActiveCount}",
                userId,
                activeCount);

            return CheckoutResult.Failure(
                "You already have 3 books checked out. Return a book before borrowing another.",
                CheckoutFailureReason.LimitReached);
        }

        var alreadyCheckedOut = await _checkouts.HasActiveCheckoutForBookAsync(bookId, userId, ct);
        if (alreadyCheckedOut)
        {
            _logger.LogInformation(
                "checkout.duplicate book {BookId} user {UserId}",
                bookId,
                userId);

            return CheckoutResult.Failure(
                "You already have this book checked out.",
                CheckoutFailureReason.AlreadyCheckedOut);
        }

        var dueAt = DateTime.UtcNow.AddDays(LoanPeriodDays);
        var checkout = await _checkouts.CreateCheckoutAsync(bookId, userId, dueAt, ct);

        var book = await _books.GetByIdAsync(bookId, ct);
        var dto = ToDto(checkout, book?.Title ?? "Unknown", book?.Author ?? "Unknown");

        return CheckoutResult.Success(dto);
    }

    public async Task<CheckoutResult> ReturnAsync(
        Guid checkoutId, Guid userId, CancellationToken ct)
    {
        // Verify the checkout belongs to the user by checking their checkouts
        var userCheckouts = await _checkouts.ListByBorrowerAsync(userId, ct);
        var checkout = userCheckouts.FirstOrDefault(c => c.Id == checkoutId);

        if (checkout is null)
        {
            return CheckoutResult.Failure(
                "Checkout not found.",
                CheckoutFailureReason.NotFound);
        }

        if (checkout.ReturnedAt is not null)
        {
            return CheckoutResult.Failure(
                "This book has already been returned.",
                CheckoutFailureReason.NotFound);
        }

        var success = await _checkouts.TryReturnAsync(checkoutId, ct);
        if (!success)
        {
            return CheckoutResult.Failure(
                "Checkout not found.",
                CheckoutFailureReason.NotFound);
        }

        var book = await _books.GetByIdAsync(checkout.BookId, ct);

        // Build DTO with ReturnedAt set to now (TryReturnAsync sets it in the DB).
        // Checkout is a class, not a record, so we create the DTO directly.
        var dto = new CheckoutDto(
            checkout.Id,
            checkout.BookId,
            book?.Title ?? "Unknown",
            book?.Author ?? "Unknown",
            checkout.CheckedOutAt,
            checkout.DueAt,
            DateTime.UtcNow,
            "Returned");

        return CheckoutResult.Success(dto);
    }

    public async Task<IReadOnlyList<CheckoutDto>> GetMyCheckoutsAsync(
        Guid userId, CancellationToken ct)
    {
        var checkouts = await _checkouts.ListByBorrowerAsync(userId, ct);
        return await EnrichWithBookDataAsync(checkouts, ct);
    }

    public async Task<IReadOnlyList<CheckoutDto>> GetAllActiveCheckoutsAsync(
        CancellationToken ct)
    {
        var checkouts = await _checkouts.ListActiveAsync(ct);
        return await EnrichWithBookDataAsync(checkouts, ct);
    }

    private async Task<IReadOnlyList<CheckoutDto>> EnrichWithBookDataAsync(
        IReadOnlyList<Checkout> checkouts, CancellationToken ct)
    {
        var bookIds = checkouts.Select(c => c.BookId).Distinct().ToList();
        var bookLookup = new Dictionary<Guid, Book>();

        foreach (var bookId in bookIds)
        {
            var book = await _books.GetByIdAsync(bookId, ct);
            if (book is not null)
            {
                bookLookup[bookId] = book;
            }
        }

        return checkouts
            .Select(c =>
            {
                var hasBook = bookLookup.TryGetValue(c.BookId, out var book);
                return ToDto(c, hasBook ? book!.Title : "Unknown", hasBook ? book!.Author : "Unknown");
            })
            .ToList()
            .AsReadOnly();
    }

    // Invariant #4: status is computed, never stored
    private static string ComputeStatus(Checkout checkout)
    {
        if (checkout.ReturnedAt is not null)
        {
            return "Returned";
        }

        return checkout.DueAt < DateTime.UtcNow ? "Overdue" : "Active";
    }

    private static CheckoutDto ToDto(Checkout checkout, string bookTitle, string bookAuthor) =>
        new(
            checkout.Id,
            checkout.BookId,
            bookTitle,
            bookAuthor,
            checkout.CheckedOutAt,
            checkout.DueAt,
            checkout.ReturnedAt,
            ComputeStatus(checkout));
}
