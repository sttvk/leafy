using Lms.Domain.Entities;

namespace Lms.Domain.Repositories;

public interface ICheckoutRepository
{
    Task<Checkout> CreateCheckoutAsync(Guid bookId, Guid borrowerUserId, DateTime dueAt, CancellationToken ct);

    Task<bool> TryReturnAsync(Guid checkoutId, CancellationToken ct);

    Task<bool> HasActiveCheckoutForBookAsync(Guid bookId, Guid borrowerUserId, CancellationToken ct);

    Task<IReadOnlyList<Checkout>> ListByBorrowerAsync(Guid borrowerUserId, CancellationToken ct);

    Task<int> CountActiveByBorrowerAsync(Guid borrowerUserId, CancellationToken ct);

    Task<IReadOnlyList<Checkout>> ListActiveAsync(CancellationToken ct);
}
