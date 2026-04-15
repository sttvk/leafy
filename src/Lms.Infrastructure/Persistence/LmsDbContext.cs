using Lms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Lms.Infrastructure.Persistence;

public sealed class LmsDbContext : DbContext
{
    public LmsDbContext(DbContextOptions<LmsDbContext> options)
        : base(options)
    {
        // NoTracking by default per efcore-patterns skill. Write paths
        // opt-in explicitly via AsTracking() or DbSet.Add/Update.
        ChangeTracker.QueryTrackingBehavior = QueryTrackingBehavior.NoTracking;
    }

    public DbSet<Book> Books => Set<Book>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Checkout> Checkouts => Set<Checkout>();
    public DbSet<BookEmbedding> BookEmbeddings => Set<BookEmbedding>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(LmsDbContext).Assembly);
    }
}
