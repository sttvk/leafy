using Lms.Application.Books;
using Lms.Domain.Entities;
using Lms.Domain.Repositories;
using Microsoft.Extensions.Logging;

namespace Lms.Application.Search;

public sealed class SearchService
{
    private const int RrfK = 60;
    private const int DefaultLimit = 25;

    private readonly IBookRepository _bookRepo;
    private readonly IEmbeddingService _embeddingService;
    private readonly ITextGenerationService _textGenerationService;
    private readonly ILogger<SearchService> _logger;

    public SearchService(
        IBookRepository bookRepo,
        IEmbeddingService embeddingService,
        ITextGenerationService textGenerationService,
        ILogger<SearchService> logger)
    {
        _bookRepo = bookRepo;
        _embeddingService = embeddingService;
        _textGenerationService = textGenerationService;
        _logger = logger;
    }

    public async Task<SearchResponse> SearchAsync(
        string query, int limit, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return new SearchResponse(Array.Empty<BookSearchResult>(), null);
        }

        var clampedLimit = Math.Clamp(limit, 1, DefaultLimit);

        // 1. Keyword search
        var keywordBooks = await _bookRepo.KeywordSearchAsync(query, clampedLimit, ct);

        // 2. Semantic search
        IReadOnlyList<(Guid BookId, double Similarity)> semanticRanked;
        try
        {
            var queryEmbedding = await _embeddingService.GenerateEmbeddingAsync(query, ct);
            var allEmbeddings = await _bookRepo.GetAllEmbeddingsAsync(ct);
            semanticRanked = RankBySimilarity(queryEmbedding, allEmbeddings, clampedLimit);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Semantic search failed, falling back to keyword-only results");
            semanticRanked = Array.Empty<(Guid, double)>();
        }

        // 3. Reciprocal Rank Fusion
        var results = await FuseResultsAsync(keywordBooks, semanticRanked, clampedLimit, _bookRepo, ct);

        // 4. Generate AI summary (non-blocking — null on failure)
        var summary = await GenerateSearchSummaryAsync(query, results.Count, ct);

        return new SearchResponse(results, summary);
    }

    private async Task<string?> GenerateSearchSummaryAsync(
        string query, int resultCount, CancellationToken ct)
    {
        if (resultCount == 0)
        {
            return null;
        }

        try
        {
            var prompt =
                $"The user searched for '{query}' in a book library. We found {resultCount} results. " +
                "In one sentence (under 30 words), describe what kinds of books match this search. " +
                "Be helpful and conversational. Do not list book titles.";

            return await _textGenerationService.GenerateTextAsync(prompt, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to generate search summary for query {Query}", query);
            return null;
        }
    }

    private static IReadOnlyList<(Guid BookId, double Similarity)> RankBySimilarity(
        float[] queryEmbedding,
        IReadOnlyList<(Guid BookId, float[] Vector)> allEmbeddings,
        int limit)
    {
        return allEmbeddings
            .Select(e => (e.BookId, Similarity: CosineSimilarity(queryEmbedding, e.Vector)))
            .OrderByDescending(x => x.Similarity)
            .Take(limit)
            .ToList()
            .AsReadOnly();
    }

    private static async Task<IReadOnlyList<BookSearchResult>> FuseResultsAsync(
        IReadOnlyList<Book> keywordBooks,
        IReadOnlyList<(Guid BookId, double Similarity)> semanticRanked,
        int limit,
        IBookRepository bookRepo,
        CancellationToken ct)
    {
        var scores = new Dictionary<Guid, double>();
        var metadata = new Dictionary<Guid, Book>();

        // Score keyword results by rank
        for (var rank = 0; rank < keywordBooks.Count; rank++)
        {
            var book = keywordBooks[rank];
            var rrfScore = 1.0 / (RrfK + rank + 1);
            scores[book.Id] = scores.GetValueOrDefault(book.Id) + rrfScore;
            metadata[book.Id] = book;
        }

        // Score semantic results by rank
        for (var rank = 0; rank < semanticRanked.Count; rank++)
        {
            var item = semanticRanked[rank];
            var rrfScore = 1.0 / (RrfK + rank + 1);
            scores[item.BookId] = scores.GetValueOrDefault(item.BookId) + rrfScore;
        }

        // Fetch metadata for semantic-only results missing from the keyword set
        var missingIds = scores.Keys.Where(id => !metadata.ContainsKey(id)).ToList();
        if (missingIds.Count > 0)
        {
            var missingBooks = await bookRepo.GetByIdsAsync(missingIds, ct);
            foreach (var book in missingBooks)
            {
                metadata[book.Id] = book;
            }
        }

        return scores
            .OrderByDescending(kv => kv.Value)
            .Take(limit)
            .Select(kv =>
            {
                var book = metadata.GetValueOrDefault(kv.Key);
                return new BookSearchResult(
                    kv.Key,
                    book?.Title ?? string.Empty,
                    book?.Author ?? string.Empty,
                    book?.Genre,
                    book?.CoverImageUrl,
                    kv.Value);
            })
            .ToList()
            .AsReadOnly();
    }

    internal static double CosineSimilarity(float[] a, float[] b)
    {
        if (a.Length != b.Length || a.Length == 0)
        {
            return 0.0;
        }

        double dot = 0, magA = 0, magB = 0;
        for (var i = 0; i < a.Length; i++)
        {
            dot += a[i] * (double)b[i];
            magA += a[i] * (double)a[i];
            magB += b[i] * (double)b[i];
        }

        var denominator = Math.Sqrt(magA) * Math.Sqrt(magB);
        return denominator == 0 ? 0.0 : dot / denominator;
    }
}
