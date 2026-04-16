using Lms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Lms.Infrastructure.Persistence.Configurations;

internal sealed class BookConfiguration : IEntityTypeConfiguration<Book>
{
    public void Configure(EntityTypeBuilder<Book> builder)
    {
        builder.ToTable("Books");

        builder.HasKey(b => b.Id);

        builder.Property(b => b.Id)
            .HasColumnType("uniqueidentifier")
            .HasDefaultValueSql("NEWID()");

        builder.Property(b => b.Title)
            .HasColumnType("nvarchar(500)")
            .IsRequired();

        builder.Property(b => b.Author)
            .HasColumnType("nvarchar(300)")
            .IsRequired();

        builder.Property(b => b.Isbn)
            .HasColumnType("varchar(20)");

        builder.Property(b => b.PublicationYear)
            .HasColumnType("int");

        builder.Property(b => b.Genre)
            .HasColumnType("nvarchar(100)");

        builder.Property(b => b.Description)
            .HasColumnType("nvarchar(max)");

        builder.Property(b => b.CoverImageUrl)
            .HasColumnType("nvarchar(1000)");

        builder.Property(b => b.AddedAt)
            .HasColumnType("datetime2")
            .HasDefaultValueSql("SYSUTCDATETIME()");

        builder.Property(b => b.IsDeleted)
            .HasColumnType("bit")
            .HasDefaultValue(false);

        builder.HasIndex(b => b.Title).HasDatabaseName("IX_Books_Title");
        builder.HasIndex(b => b.Author).HasDatabaseName("IX_Books_Author");

        // Soft-delete filter per sql-server-patterns.md. Centralised here so
        // repositories never scatter .Where(b => !b.IsDeleted).
        builder.HasQueryFilter(b => !b.IsDeleted);
    }
}
