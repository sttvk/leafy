using Lms.Domain.Entities;
using Lms.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Lms.Infrastructure.Persistence.Repositories;

internal sealed class BookRepository : IBookRepository
{
    private readonly LmsDbContext _db;

    public BookRepository(LmsDbContext db)
    {
        _db = db;
    }

    public Task<Book?> GetByIdAsync(Guid id, CancellationToken ct)
        => _db.Books.AsNoTracking().FirstOrDefaultAsync(b => b.Id == id, ct);

    public async Task<IReadOnlyList<Book>> ListAsync(CancellationToken ct)
        => await _db.Books.AsNoTracking().OrderBy(b => b.Title).ToListAsync(ct);

    public async Task<(IReadOnlyList<Book> Items, int TotalCount)> ListAsync(
        int page, int pageSize, CancellationToken ct)
    {
        var query = _db.Books.AsNoTracking().OrderBy(b => b.Title);
        var totalCount = await query.CountAsync(ct);
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);
        return (items, totalCount);
    }

    public async Task AddAsync(Book book, CancellationToken ct)
    {
        _db.Books.Add(book);
        await _db.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(Book book, CancellationToken ct)
    {
        _db.Books.Update(book);
        await _db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct)
    {
        // Soft delete — the global query filter hides IsDeleted rows.
        var rows = await _db.Books
            .Where(b => b.Id == id)
            .ExecuteUpdateAsync(
                s => s.SetProperty(b => b.IsDeleted, true),
                ct);
        _ = rows;
    }
}
