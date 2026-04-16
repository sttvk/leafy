using Lms.Infrastructure;
using Lms.Infrastructure.Persistence;
using Lms.Migrations.Seeding;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddLmsInfrastructure(builder.Configuration);

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
    return 0;
}
catch (Exception ex)
{
    logger.LogError(ex, "Migration run failed.");
    return 1;
}

// Marker type so ILogger<Program> resolves against this assembly.
public partial class Program;
