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

    public async Task<IReadOnlyList<Book>> GetByIdsAsync(IEnumerable<Guid> ids, CancellationToken ct)
    {
        var idList = ids.ToList();
        if (idList.Count == 0)
        {
            return Array.Empty<Book>();
        }

        return await _db.Books
            .AsNoTracking()
            .Where(b => idList.Contains(b.Id))
            .ToListAsync(ct);
    }

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

    public async Task<IReadOnlyList<Book>> KeywordSearchAsync(
        string query, int limit, CancellationToken ct)
    {
        var pattern = $"%{query}%";

        // Order by relevance: title match first, then author, then everything else.
        var results = await _db.Books
            .AsNoTracking()
            .Where(b =>
                EF.Functions.Like(b.Title, pattern) ||
                EF.Functions.Like(b.Author, pattern) ||
                (b.Genre != null && EF.Functions.Like(b.Genre, pattern)) ||
                (b.Description != null && EF.Functions.Like(b.Description, pattern)) ||
                (b.Isbn != null && EF.Functions.Like(b.Isbn, pattern)))
            .OrderBy(b => EF.Functions.Like(b.Title, pattern) ? 0 : 1)
            .ThenBy(b => EF.Functions.Like(b.Author, pattern) ? 0 : 1)
            .ThenBy(b => b.Title)
            .Take(limit)
            .ToListAsync(ct);

        return results;
    }

    public async Task<IReadOnlyList<(Guid BookId, float[] Vector)>> GetAllEmbeddingsAsync(
        CancellationToken ct)
    {
        var embeddings = await _db.BookEmbeddings
            .AsNoTracking()
            .Select(e => new { e.BookId, e.Vector })
            .ToListAsync(ct);

        return embeddings
            .Select(e => (e.BookId, Vector: BytesToFloats(e.Vector)))
            .ToList()
            .AsReadOnly();
    }

    public async Task UpsertEmbeddingAsync(
        Guid bookId, float[] vector, string modelName, int dimensions, CancellationToken ct)
    {
        var bytes = FloatsToBytes(vector);

        var existing = await _db.BookEmbeddings
            .AsTracking()
            .FirstOrDefaultAsync(e => e.BookId == bookId, ct);

        if (existing is not null)
        {
            existing.Vector = bytes;
            existing.ModelName = modelName;
            existing.Dimensions = dimensions;
            existing.CreatedAt = DateTime.UtcNow;
        }
        else
        {
            _db.BookEmbeddings.Add(new BookEmbedding
            {
                BookId = bookId,
                Vector = bytes,
                ModelName = modelName,
                Dimensions = dimensions,
                CreatedAt = DateTime.UtcNow,
            });
        }

        await _db.SaveChangesAsync(ct);
    }

    private static float[] BytesToFloats(byte[] bytes)
    {
        var floats = new float[bytes.Length / sizeof(float)];
        Buffer.BlockCopy(bytes, 0, floats, 0, bytes.Length);
        return floats;
    }

    private static byte[] FloatsToBytes(float[] floats)
    {
        var bytes = new byte[floats.Length * sizeof(float)];
        Buffer.BlockCopy(floats, 0, bytes, 0, bytes.Length);
        return bytes;
    }
}
