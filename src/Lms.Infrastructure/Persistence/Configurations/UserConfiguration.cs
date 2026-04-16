using Lms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Lms.Infrastructure.Persistence.Configurations;

internal sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");

        builder.Property(u => u.Id)
            .HasColumnType("uniqueidentifier")
            .HasDefaultValueSql("NEWID()");

        builder.Property(u => u.DisplayName)
            .HasColumnType("nvarchar(200)")
            .IsRequired();

        builder.Property(u => u.Role)
            .HasColumnType("tinyint")
            .HasDefaultValue(UserRole.Member);

        builder.Property(u => u.CreatedAt)
            .HasColumnType("datetime2")
            .HasDefaultValueSql("SYSUTCDATETIME()");

        builder.HasIndex(u => u.Email).IsUnique().HasFilter(null);
    }
}
