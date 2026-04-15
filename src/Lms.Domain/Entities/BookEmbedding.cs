namespace Lms.Domain.Entities;

public sealed class BookEmbedding
{
    public Guid BookId { get; set; }
    public byte[] Vector { get; set; } = Array.Empty<byte>();
    public int Dimensions { get; set; }
    public string ModelName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
