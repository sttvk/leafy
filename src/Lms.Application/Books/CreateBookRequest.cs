namespace Lms.Application.Books;

public sealed record CreateBookRequest(
    string Title,
    string Author,
    string? Isbn,
    int? PublicationYear,
    string? Genre,
    string? Description,
    string? CoverImageUrl);
