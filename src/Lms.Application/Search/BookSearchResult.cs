namespace Lms.Application.Search;

public sealed record BookSearchResult(
    Guid Id,
    string Title,
    string Author,
    string? Genre,
    string? CoverImageUrl,
    double Score);

public sealed record SearchResponse(
    IReadOnlyList<BookSearchResult> Results,
    string? Summary);
