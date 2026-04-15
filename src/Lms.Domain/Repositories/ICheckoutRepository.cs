using Lms.Domain.Entities;

namespace Lms.Domain.Repositories;

public interface ICheckoutRepository
{
    // Atomic compare-and-set per invariant #3: returns true on success,
    // false when the book has zero available copies.
    Task<bool> TryCheckoutAsync(Guid bookId, Guid borrowerUserId, DateTime dueAt, CancellationToken ct);

    Task<bool> TryReturnAsync(Guid checkoutId, CancellationToken ct);

    Task<IReadOnlyList<Checkout>> ListByBorrowerAsync(Guid borrowerUserId, CancellationToken ct);
}
