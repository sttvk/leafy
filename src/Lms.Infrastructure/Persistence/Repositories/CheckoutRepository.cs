using Lms.Domain.Entities;
using Lms.Domain.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Lms.Infrastructure.Persistence.Repositories;

internal sealed class CheckoutRepository : ICheckoutRepository
{
    private readonly LmsDbContext _db;
    private readonly ILogger<CheckoutRepository> _logger;

    public CheckoutRepository(LmsDbContext db, ILogger<CheckoutRepository> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<Checkout> CreateCheckoutAsync(
        Guid bookId,
        Guid borrowerUserId,
        DateTime dueAt,
        CancellationToken ct)
    {
        var checkout = new Checkout
        {
            BookId = bookId,
            BorrowerUserId = borrowerUserId,
            DueAt = dueAt,
        };

        _db.Checkouts.Add(checkout);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "checkout.success book {BookId} user {UserId}",
            bookId,
            borrowerUserId);

        return checkout;
    }

    public async Task<bool> TryReturnAsync(Guid checkoutId, CancellationToken ct)
    {
        var checkout = await _db.Checkouts
            .AsTracking()
            .FirstOrDefaultAsync(c => c.Id == checkoutId, ct);

        if (checkout is null || checkout.ReturnedAt is not null)
        {
            return false;
        }

        checkout.ReturnedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "checkout.return checkout {CheckoutId} book {BookId}",
            checkoutId,
            checkout.BookId);

        return true;
    }

    public async Task<bool> HasActiveCheckoutForBookAsync(
        Guid bookId,
        Guid borrowerUserId,
        CancellationToken ct)
    {
        return await _db.Checkouts
            .AsNoTracking()
            .AnyAsync(
                c => c.BookId == bookId
                    && c.BorrowerUserId == borrowerUserId
                    && c.ReturnedAt == null,
                ct);
    }

    public async Task<Checkout?> GetByIdAndBorrowerAsync(
        Guid checkoutId,
        Guid borrowerUserId,
        CancellationToken ct)
    {
        return await _db.Checkouts
            .AsNoTracking()
            .FirstOrDefaultAsync(
                c => c.Id == checkoutId && c.BorrowerUserId == borrowerUserId,
                ct);
    }

    public async Task<Checkout?> GetActiveCheckoutForBookAsync(
        Guid bookId,
        Guid borrowerUserId,
        CancellationToken ct)
    {
        return await _db.Checkouts
            .AsNoTracking()
            .FirstOrDefaultAsync(
                c => c.BookId == bookId
                    && c.BorrowerUserId == borrowerUserId
                    && c.ReturnedAt == null,
                ct);
    }

    public async Task<IReadOnlyList<Checkout>> ListByBorrowerAsync(
        Guid borrowerUserId,
        CancellationToken ct)
    {
        return await _db.Checkouts
            .AsNoTracking()
            .Where(c => c.BorrowerUserId == borrowerUserId)
            .OrderByDescending(c => c.CheckedOutAt)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<Checkout>> ListActiveAsync(CancellationToken ct)
    {
        return await _db.Checkouts
            .AsNoTracking()
            .Where(c => c.ReturnedAt == null)
            .OrderByDescending(c => c.CheckedOutAt)
            .ToListAsync(ct);
    }
}
