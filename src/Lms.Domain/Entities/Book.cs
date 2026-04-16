namespace Lms.Domain.Entities;

public sealed class Book
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Author { get; set; } = string.Empty;
    public string? Isbn { get; set; }
    public int? PublicationYear { get; set; }
    public string? Genre { get; set; }
    public string? Description { get; set; }
    public string? CoverImageUrl { get; set; }
    public DateTime AddedAt { get; set; }
    public bool IsDeleted { get; set; }
}
