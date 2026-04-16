using System.Text.Json;
using Lms.Domain.Entities;
using Lms.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Lms.Migrations.Seeding;

public static class DatabaseSeeder
{
    private const string BooksResourceName = "Lms.Migrations.SeedData.books.json";
    private const int SeedRandomSeed = 42;
    private const int MinCopies = 1;
    private const int MaxCopiesExclusive = 6;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };

    public static async Task SeedAsync(
        LmsDbContext db,
        IConfiguration configuration,
        ILogger logger,
        CancellationToken ct)
    {
        var enabled = configuration.GetValue("Seed:Enabled", true);
        if (!enabled)
        {
            logger.LogInformation("seed skipped (Seed:Enabled=false)");
            return;
        }

        if (await db.Books.AnyAsync(ct))
        {
            var existing = await db.Books.CountAsync(ct);
            logger.LogInformation(
                "seed skipped (books already present, count={Count})",
                existing);
            return;
        }

        var dtos = LoadBooksFromResource();
        var rng = new Random(SeedRandomSeed);
        var addedAt = DateTime.UtcNow;

        var entities = dtos
            .Select(dto => MapToEntity(dto, rng, addedAt))
            .ToList();

        await db.Books.AddRangeAsync(entities, ct);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("seed applied: {Count} books", entities.Count);
    }

    private static List<BookSeedDto> LoadBooksFromResource()
    {
        var assembly = typeof(DatabaseSeeder).Assembly;
        using var stream = assembly.GetManifestResourceStream(BooksResourceName);
        if (stream is null)
        {
            throw new InvalidOperationException(
                $"Embedded seed resource not found: {BooksResourceName}");
        }

        var dtos = JsonSerializer.Deserialize<List<BookSeedDto>>(stream, JsonOptions);
        if (dtos is null)
        {
            throw new InvalidOperationException(
                $"Failed to deserialize seed resource: {BooksResourceName}");
        }

        return dtos;
    }

    private static Book MapToEntity(BookSeedDto dto, Random rng, DateTime addedAt)
    {
        var totalCopies = rng.Next(MinCopies, MaxCopiesExclusive);
        return new Book
        {
            Id = Guid.NewGuid(),
            Title = dto.Title,
            Author = dto.Author,
            Isbn = dto.Isbn,
            Genre = dto.Genre,
            PublicationYear = dto.PublicationYear,
            CoverImageUrl = dto.CoverImageUrl,
            Description = dto.Description,
            TotalCopies = totalCopies,
            AvailableCopies = totalCopies,
            AddedAt = addedAt,
            IsDeleted = false,
        };
    }

    private sealed record BookSeedDto(
        string Title,
        string Author,
        string? Isbn,
        string? Genre,
        int? PublicationYear,
        string? CoverImageUrl,
        string? Description);
}
