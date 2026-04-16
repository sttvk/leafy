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

    // Invariant #3: atomic compare-and-set. A single UPDATE with a predicate
    // on AvailableCopies > 0 is the only correct implementation. Do NOT
    // replace with a read-then-write, a rowversion check, or app-side locking.
    public async Task<bool> TryCheckoutAsync(
        Guid bookId,
        Guid borrowerUserId,
        DateTime dueAt,
        CancellationToken ct)
    {
        var strategy = _db.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            await using var tx = await _db.Database.BeginTransactionAsync(ct);

            var rows = await _db.Database.ExecuteSqlInterpolatedAsync(
                $"UPDATE Books SET AvailableCopies = AvailableCopies - 1 WHERE Id = {bookId} AND AvailableCopies > 0",
                ct);

            if (rows == 0)
            {
                await tx.RollbackAsync(ct);
                _logger.LogInformation(
                    "checkout.denied book {BookId} user {UserId}",
                    bookId,
                    borrowerUserId);
                return false;
            }

            var checkout = new Checkout
            {
                BookId = bookId,
                BorrowerUserId = borrowerUserId,
                DueAt = dueAt,
            };
            _db.Checkouts.Add(checkout);
            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            _logger.LogInformation(
                "checkout.success book {BookId} user {UserId}",
                bookId,
                borrowerUserId);
            return true;
        });
    }

    public async Task<bool> TryReturnAsync(Guid checkoutId, CancellationToken ct)
    {
        var strategy = _db.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            await using var tx = await _db.Database.BeginTransactionAsync(ct);

            var checkout = await _db.Checkouts
                .AsTracking()
                .FirstOrDefaultAsync(c => c.Id == checkoutId, ct);

            if (checkout is null || checkout.ReturnedAt is not null)
            {
                await tx.RollbackAsync(ct);
                return false;
            }

            checkout.ReturnedAt = DateTime.UtcNow;

            await _db.Database.ExecuteSqlInterpolatedAsync(
                $"UPDATE Books SET AvailableCopies = AvailableCopies + 1 WHERE Id = {checkout.BookId}",
                ct);

            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            _logger.LogInformation(
                "checkout.return checkout {CheckoutId} book {BookId}",
                checkoutId,
                checkout.BookId);
            return true;
        });
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

    public async Task<int> CountActiveByBorrowerAsync(
        Guid borrowerUserId,
        CancellationToken ct)
    {
        return await _db.Checkouts
            .AsNoTracking()
            .CountAsync(c => c.BorrowerUserId == borrowerUserId && c.ReturnedAt == null, ct);
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
