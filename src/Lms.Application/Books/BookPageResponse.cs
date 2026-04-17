namespace Lms.Application.Books;

public sealed record BookPageResponse(
    int PageNumber,
    int TotalPages,
    string Content);
