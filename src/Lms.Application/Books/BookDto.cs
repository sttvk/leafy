namespace Lms.Application.Books;

public sealed record BookDto(
    Guid Id,
    string Title,
    string Author,
    string? Isbn,
    int? PublicationYear,
    string? Genre,
    string? Description,
    string? CoverImageUrl,
    DateTime AddedAt,
    bool CanRent);
