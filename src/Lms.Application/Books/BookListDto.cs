namespace Lms.Application.Books;

public sealed record BookListDto(
    Guid Id,
    string Title,
    string Author,
    string? Genre,
    string? CoverImageUrl);
