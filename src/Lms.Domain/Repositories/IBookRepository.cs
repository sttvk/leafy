using Lms.Domain.Entities;

namespace Lms.Domain.Repositories;

public interface IBookRepository
{
    Task<Book?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<IReadOnlyList<Book>> ListAsync(CancellationToken ct);
    Task AddAsync(Book book, CancellationToken ct);
    Task UpdateAsync(Book book, CancellationToken ct);
    Task DeleteAsync(Guid id, CancellationToken ct);
}
