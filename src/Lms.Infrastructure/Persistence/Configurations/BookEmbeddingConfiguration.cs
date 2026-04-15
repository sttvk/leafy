using Lms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Lms.Infrastructure.Persistence.Configurations;

internal sealed class BookEmbeddingConfiguration : IEntityTypeConfiguration<BookEmbedding>
{
    public void Configure(EntityTypeBuilder<BookEmbedding> builder)
    {
        builder.ToTable("BookEmbeddings");
        builder.HasKey(e => e.BookId);

        builder.Property(e => e.BookId)
            .HasColumnType("uniqueidentifier");

        builder.Property(e => e.Vector)
            .HasColumnType("varbinary(max)")
            .IsRequired();

        builder.Property(e => e.Dimensions)
            .HasColumnType("int")
            .IsRequired();

        builder.Property(e => e.ModelName)
            .HasColumnType("nvarchar(100)")
            .IsRequired();

        builder.Property(e => e.CreatedAt)
            .HasColumnType("datetime2")
            .HasDefaultValueSql("SYSUTCDATETIME()");

        builder.HasOne<Book>()
            .WithOne()
            .HasForeignKey<BookEmbedding>(e => e.BookId)
            .HasConstraintName("FK_BookEmbeddings_Books")
            .OnDelete(DeleteBehavior.Cascade);
    }
}
