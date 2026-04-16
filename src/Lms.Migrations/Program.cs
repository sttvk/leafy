using Lms.Domain.Entities;
using Lms.Infrastructure;
using Lms.Infrastructure.Persistence;
using Lms.Migrations.Seeding;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddLmsInfrastructure(builder.Configuration);
builder.Services.AddHttpContextAccessor();
builder.Services.AddDataProtection();
builder.Services.AddLogging();

// Relax password policy for the seed account (dev-only seeder).
// The API project keeps the stricter policy from DependencyInjection.cs.
builder.Services.Configure<IdentityOptions>(options =>
{
    options.Password.RequireUppercase = false;
    options.Password.RequiredLength = 6;
});

using var host = builder.Build();

using var scope = host.Services.CreateScope();
var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
var db = scope.ServiceProvider.GetRequiredService<LmsDbContext>();

try
{
    var pending = await db.Database.GetPendingMigrationsAsync();
    var pendingList = pending.ToList();
    if (pendingList.Count == 0)
    {
        logger.LogInformation("No pending migrations. Database is up to date.");
    }
    else
    {
        logger.LogInformation("Applying {Count} pending migration(s).", pendingList.Count);
        await db.Database.MigrateAsync();
        logger.LogInformation("Migrations applied.");
    }

    await DatabaseSeeder.SeedAsync(db, builder.Configuration, logger, CancellationToken.None);
    await SeedLibrarianAsync(scope.ServiceProvider, logger);
    return 0;
}
catch (Exception ex)
{
    logger.LogError(ex, "Migration run failed.");
    return 1;
}

static async Task SeedLibrarianAsync(IServiceProvider services, ILogger logger)
{
    const string adminEmail = "admin@lms.com";
    const string adminPassword = "admin@123";
    const string adminDisplayName = "Admin";

    var userManager = services.GetRequiredService<UserManager<User>>();

    var existing = await userManager.FindByEmailAsync(adminEmail);
    if (existing is not null)
    {
        logger.LogInformation("Librarian account already exists, skipping seed.");
        return;
    }

    var user = new User
    {
        UserName = adminEmail,
        Email = adminEmail,
        DisplayName = adminDisplayName,
        Role = UserRole.Librarian,
        EmailConfirmed = true,
        CreatedAt = DateTime.UtcNow,
    };

    var result = await userManager.CreateAsync(user, adminPassword);
    if (result.Succeeded)
    {
        logger.LogInformation("Librarian account seeded: {Email}", adminEmail);
    }
    else
    {
        var errors = string.Join("; ", result.Errors.Select(e => e.Description));
        logger.LogWarning("Failed to seed librarian account: {Errors}", errors);
    }
}

// Marker type so ILogger<Program> resolves against this assembly.
public partial class Program;
