using Lms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Lms.Infrastructure.Persistence.Configurations;

internal sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");
        builder.HasKey(u => u.Id);

        builder.Property(u => u.Id)
            .HasColumnType("uniqueidentifier")
            .HasDefaultValueSql("NEWID()");

        builder.Property(u => u.ExternalId)
            .HasColumnType("nvarchar(200)")
            .IsRequired();

        builder.Property(u => u.Email)
            .HasColumnType("nvarchar(320)")
            .IsRequired();

        builder.Property(u => u.DisplayName)
            .HasColumnType("nvarchar(200)")
            .IsRequired();

        builder.Property(u => u.Role)
            .HasColumnType("tinyint")
            .HasDefaultValue(UserRole.Member);

        builder.Property(u => u.CreatedAt)
            .HasColumnType("datetime2")
            .HasDefaultValueSql("SYSUTCDATETIME()");

        builder.HasIndex(u => u.ExternalId).IsUnique();
        builder.HasIndex(u => u.Email).IsUnique();
    }
}
