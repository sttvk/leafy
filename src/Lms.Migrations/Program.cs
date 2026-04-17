using Lms.Application.Search;
using Lms.Domain.Entities;
using Lms.Domain.Repositories;
using Lms.Infrastructure;
using Lms.Infrastructure.Persistence;
using Lms.Migrations.Seeding;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

var builder = Host.CreateApplicationBuilder(args);
builder.Configuration.AddUserSecrets<Program>(optional: true);

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
    await SeedEmbeddingsAsync(scope.ServiceProvider, logger, CancellationToken.None);
    return 0;
}
catch (Exception ex)
{
    logger.LogError(ex, "Migration run failed.");
    return 1;
}

static async Task SeedLibrarianAsync(IServiceProvider services, ILogger logger)
{
    const string adminEmail = "admin@leafy.com";
    const string adminPassword = "Admin@123";
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

static async Task SeedEmbeddingsAsync(
    IServiceProvider services, ILogger logger, CancellationToken ct)
{
    const int delayBetweenRequestsMs = 100;
    const int maxRetries = 3;
    const int retryBackoffMs = 2000;
    const int progressIntervalBooks = 50;
    const string modelName = "gemini-embedding-001";

    var configuration = services.GetRequiredService<IConfiguration>();
    var apiKey = configuration["Gemini:ApiKey"] ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY");
    if (string.IsNullOrEmpty(apiKey))
    {
        logger.LogInformation("Gemini:ApiKey not configured, skipping embedding seed.");
        return;
    }

    var db = services.GetRequiredService<LmsDbContext>();
    var embeddingService = services.GetRequiredService<IEmbeddingService>();
    var bookRepo = services.GetRequiredService<IBookRepository>();

    // Find books without embeddings
    var existingEmbeddingBookIds = await db.BookEmbeddings
        .Select(e => e.BookId)
        .ToListAsync(ct);
    var existingSet = existingEmbeddingBookIds.ToHashSet();

    var booksWithoutEmbeddings = await db.Books
        .AsNoTracking()
        .Where(b => !existingSet.Contains(b.Id))
        .ToListAsync(ct);

    if (booksWithoutEmbeddings.Count == 0)
    {
        logger.LogInformation("All books already have embeddings, skipping embedding seed.");
        return;
    }

    logger.LogInformation(
        "Generating embeddings for {Count} books...", booksWithoutEmbeddings.Count);

    var processed = 0;
    var succeeded = 0;
    var total = booksWithoutEmbeddings.Count;

    foreach (var book in booksWithoutEmbeddings)
    {
        var searchableText = string.Join(" ",
            new[] { book.Title, book.Author, book.Genre, book.Description }
                .Where(p => !string.IsNullOrWhiteSpace(p)));

        processed++;

        if (string.IsNullOrWhiteSpace(searchableText))
        {
            continue;
        }

        // Retry on 429 with fixed backoff
        float[]? vector = null;
        for (int attempt = 0; attempt < maxRetries; attempt++)
        {
            try
            {
                vector = await embeddingService.GenerateEmbeddingAsync(searchableText, ct);
                break;
            }
            catch (HttpRequestException ex) when (ex.Message.Contains("429"))
            {
                logger.LogWarning(
                    "Rate limited on book {BookId}, retry {Attempt}/{Max} after {Backoff}ms",
                    book.Id, attempt + 1, maxRetries, retryBackoffMs);
                await Task.Delay(retryBackoffMs, ct);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex,
                    "Failed to generate embedding for book {BookId}, skipping",
                    book.Id);
                break;
            }
        }

        if (vector is not null)
        {
            await bookRepo.UpsertEmbeddingAsync(book.Id, vector, modelName, vector.Length, ct);
            succeeded++;
        }

        if (processed % progressIntervalBooks == 0)
        {
            logger.LogInformation(
                "Embedding progress: {Processed}/{Total} processed, {Succeeded} succeeded",
                processed, total, succeeded);
        }

        if (processed < total)
        {
            await Task.Delay(delayBetweenRequestsMs, ct);
        }
    }

    logger.LogInformation(
        "Embedding seed complete: {Processed} processed, {Succeeded} succeeded out of {Total}",
        processed, succeeded, total);
}

// Marker type so ILogger<Program> resolves against this assembly.
public partial class Program;
