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
        }
        else
        {
            var dtos = LoadBooksFromResource();
            var addedAt = DateTime.UtcNow;

            var entities = dtos
                .Select(dto => MapToEntity(dto, addedAt))
                .ToList();

            await db.Books.AddRangeAsync(entities, ct);
            await db.SaveChangesAsync(ct);

            logger.LogInformation("seed applied: {Count} books", entities.Count);
        }

        await RemoveBooksWithoutCoversAsync(db, logger, ct);
    }

    private static async Task RemoveBooksWithoutCoversAsync(
        LmsDbContext db,
        ILogger logger,
        CancellationToken ct)
    {
        var booksWithoutCovers = await db.Books
            .Where(b => b.CoverImageUrl == null || b.CoverImageUrl == "")
            .ToListAsync(ct);

        if (booksWithoutCovers.Count > 0)
        {
            db.Books.RemoveRange(booksWithoutCovers);
            await db.SaveChangesAsync(ct);
            logger.LogInformation(
                "removed {Count} books without cover images",
                booksWithoutCovers.Count);
        }
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

    private static Book MapToEntity(BookSeedDto dto, DateTime addedAt)
    {
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
