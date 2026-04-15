using Lms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Lms.Infrastructure.Persistence.Configurations;

internal sealed class CheckoutConfiguration : IEntityTypeConfiguration<Checkout>
{
    public void Configure(EntityTypeBuilder<Checkout> builder)
    {
        builder.ToTable("Checkouts");
        builder.HasKey(c => c.Id);

        builder.Property(c => c.Id)
            .HasColumnType("uniqueidentifier")
            .HasDefaultValueSql("NEWID()");

        builder.Property(c => c.BookId)
            .HasColumnType("uniqueidentifier")
            .IsRequired();

        builder.Property(c => c.BorrowerUserId)
            .HasColumnType("uniqueidentifier")
            .IsRequired();

        builder.Property(c => c.CheckedOutAt)
            .HasColumnType("datetime2")
            .HasDefaultValueSql("SYSUTCDATETIME()");

        builder.Property(c => c.DueAt)
            .HasColumnType("datetime2")
            .IsRequired();

        builder.Property(c => c.ReturnedAt)
            .HasColumnType("datetime2");

        builder.HasOne<Book>()
            .WithMany()
            .HasForeignKey(c => c.BookId)
            .HasConstraintName("FK_Checkouts_Books")
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(c => c.BorrowerUserId)
            .HasConstraintName("FK_Checkouts_Users")
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(c => new { c.BorrowerUserId, c.CheckedOutAt })
            .HasDatabaseName("IX_Checkouts_Borrower")
            .IsDescending(false, true);
    }
}
