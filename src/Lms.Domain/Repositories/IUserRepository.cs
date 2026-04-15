using Lms.Domain.Entities;

namespace Lms.Domain.Repositories;

public interface IUserRepository
{
    Task<User?> GetByExternalIdAsync(string externalId, CancellationToken ct);
    Task<User> UpsertAsync(User user, CancellationToken ct);
}
