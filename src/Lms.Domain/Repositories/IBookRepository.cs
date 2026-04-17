using Lms.Domain.Entities;

namespace Lms.Domain.Repositories;

public interface IBookRepository
{
    Task<Book?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<IReadOnlyList<Book>> ListAsync(CancellationToken ct);
    Task<(IReadOnlyList<Book> Items, int TotalCount)> ListAsync(int page, int pageSize, CancellationToken ct);
    Task AddAsync(Book book, CancellationToken ct);
    Task UpdateAsync(Book book, CancellationToken ct);
    Task DeleteAsync(Guid id, CancellationToken ct);

    /// <summary>
    /// Fetch multiple books by their IDs in a single round-trip.
    /// Used to hydrate metadata for semantic-only search results.
    /// </summary>
    Task<IReadOnlyList<Book>> GetByIdsAsync(IEnumerable<Guid> ids, CancellationToken ct);

    /// <summary>
    /// Keyword search using SQL LIKE on title, author, genre, description, and ISBN.
    /// Results are ordered by relevance: title matches first, then author, then others.
    /// </summary>
    Task<IReadOnlyList<Book>> KeywordSearchAsync(string query, int limit, CancellationToken ct);

    /// <summary>
    /// Load all book embeddings with their vectors deserialized from bytes to float[].
    /// At ~750 books x 1536 floats (~4.5 MB), this is acceptable per-request.
    /// </summary>
    Task<IReadOnlyList<(Guid BookId, float[] Vector)>> GetAllEmbeddingsAsync(CancellationToken ct);

    /// <summary>
    /// Insert or update the embedding vector for a book.
    /// </summary>
    Task UpsertEmbeddingAsync(Guid bookId, float[] vector, string modelName, int dimensions, CancellationToken ct);
}
