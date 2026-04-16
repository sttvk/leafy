using Lms.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Lms.Infrastructure.Persistence;

public sealed class LmsDbContext : IdentityDbContext<User, IdentityRole<Guid>, Guid>
{
    public LmsDbContext(DbContextOptions<LmsDbContext> options)
        : base(options)
    {
        // NoTracking by default per efcore-patterns skill. Write paths
        // opt-in explicitly via AsTracking() or DbSet.Add/Update.
        ChangeTracker.QueryTrackingBehavior = QueryTrackingBehavior.NoTracking;
    }

    public DbSet<Book> Books => Set<Book>();
    public new DbSet<User> Users => Set<User>();
    public DbSet<Checkout> Checkouts => Set<Checkout>();
    public DbSet<BookEmbedding> BookEmbeddings => Set<BookEmbedding>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(LmsDbContext).Assembly);
    }
}
