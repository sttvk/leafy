namespace Lms.Application.Checkouts;

public sealed record CheckoutDto(
    Guid Id,
    Guid BookId,
    string BookTitle,
    string BookAuthor,
    DateTime CheckedOutAt,
    DateTime DueAt,
    DateTime? ReturnedAt,
    string Status);
