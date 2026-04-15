namespace Lms.Domain.Entities;

public sealed class Checkout
{
    public Guid Id { get; set; }
    public Guid BookId { get; set; }
    public Guid BorrowerUserId { get; set; }
    public DateTime CheckedOutAt { get; set; }
    public DateTime DueAt { get; set; }
    public DateTime? ReturnedAt { get; set; }
}
