using Lms.Domain.Entities;
using Lms.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Lms.Infrastructure.Persistence.Repositories;

internal sealed class UserRepository : IUserRepository
{
    private readonly LmsDbContext _db;

    public UserRepository(LmsDbContext db)
    {
        _db = db;
    }

    public Task<User?> GetByExternalIdAsync(string externalId, CancellationToken ct)
        => _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.ExternalId == externalId, ct);

    public async Task<User> UpsertAsync(User user, CancellationToken ct)
    {
        var existing = await _db.Users
            .AsTracking()
            .FirstOrDefaultAsync(u => u.ExternalId == user.ExternalId, ct);

        if (existing is null)
        {
            _db.Users.Add(user);
            await _db.SaveChangesAsync(ct);
            return user;
        }

        existing.Email = user.Email;
        existing.DisplayName = user.DisplayName;
        existing.Role = user.Role;
        await _db.SaveChangesAsync(ct);
        return existing;
    }
}
