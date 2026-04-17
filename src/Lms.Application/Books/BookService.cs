using System.Globalization;
using Lms.Application.Common;
using Lms.Application.Search;
using Lms.Domain.Entities;
using Lms.Domain.Repositories;
using Microsoft.Extensions.Logging;

namespace Lms.Application.Books;

public sealed class BookService
{
    private const int MinPublicationYear = 1000;
    private const int MaxPublicationYearOffset = 2;
    private const int DefaultPage = 1;
    private const int DefaultPageSize = 20;
    private const int MaxPageSize = 100;
    private const string EmbeddingModel = "text-embedding-3-small";

    private readonly IBookRepository _books;
    private readonly ICheckoutRepository _checkouts;
    private readonly IEmbeddingService _embeddingService;
    private readonly ILogger<BookService> _logger;

    public BookService(
        IBookRepository books,
        ICheckoutRepository checkouts,
        IEmbeddingService embeddingService,
        ILogger<BookService> logger)
    {
        _books = books;
        _checkouts = checkouts;
        _embeddingService = embeddingService;
        _logger = logger;
    }

    public async Task<BookDto?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        var book = await _books.GetByIdAsync(id, ct);
        return book is null ? null : ToDto(book);
    }

    public async Task<BookPageResponse?> GetBookPageAsync(
        Guid bookId, Guid userId, int page, CancellationToken ct)
    {
        var hasCheckout = await _checkouts.HasActiveCheckoutForBookAsync(bookId, userId, ct);
        if (!hasCheckout)
        {
            return null;
        }

        var totalPages = LoremGenerator.GetTotalPages();
        var clampedPage = Math.Clamp(page, 1, totalPages);
        var content = LoremGenerator.GeneratePage(clampedPage);

        return new BookPageResponse(clampedPage, totalPages, content);
    }

    public async Task<PagedResult<BookListDto>> ListAsync(
        int? page, int? pageSize, CancellationToken ct)
    {
        var p = Math.Max(DefaultPage, page ?? DefaultPage);
        var ps = Math.Clamp(pageSize ?? DefaultPageSize, 1, MaxPageSize);

        var (items, totalCount) = await _books.ListAsync(p, ps, ct);

        var dtos = items.Select(ToListDto).ToList().AsReadOnly();
        return new PagedResult<BookListDto>(dtos, totalCount, p, ps);
    }

    public async Task<BookDto> CreateAsync(CreateBookRequest request, CancellationToken ct)
    {
        ValidateTitle(request.Title);
        ValidateAuthor(request.Author);
        ValidatePublicationYear(request.PublicationYear);

        var book = new Book
        {
            Id = Guid.NewGuid(),
            Title = request.Title.Trim(),
            Author = request.Author.Trim(),
            Isbn = request.Isbn?.Trim(),
            PublicationYear = request.PublicationYear,
            Genre = NormalizeGenre(request.Genre),
            Description = request.Description?.Trim(),
            CoverImageUrl = request.CoverImageUrl?.Trim(),
            AddedAt = DateTime.UtcNow,
            IsDeleted = false
        };

        await _books.AddAsync(book, ct);

        await TryGenerateEmbeddingAsync(book, ct);

        return ToDto(book);
    }

    public async Task<BookDto?> UpdateAsync(
        Guid id, UpdateBookRequest request, CancellationToken ct)
    {
        ValidateTitle(request.Title);
        ValidateAuthor(request.Author);
        ValidatePublicationYear(request.PublicationYear);

        var existing = await _books.GetByIdAsync(id, ct);
        if (existing is null)
        {
            return null;
        }

        var updated = new Book
        {
            Id = existing.Id,
            Title = request.Title.Trim(),
            Author = request.Author.Trim(),
            Isbn = request.Isbn?.Trim(),
            PublicationYear = request.PublicationYear,
            Genre = NormalizeGenre(request.Genre),
            Description = request.Description?.Trim(),
            CoverImageUrl = request.CoverImageUrl?.Trim(),
            AddedAt = existing.AddedAt,
            IsDeleted = existing.IsDeleted
        };

        await _books.UpdateAsync(updated, ct);

        await TryGenerateEmbeddingAsync(updated, ct);

        return ToDto(updated);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct)
    {
        var existing = await _books.GetByIdAsync(id, ct);
        if (existing is null)
        {
            return false;
        }

        await _books.DeleteAsync(id, ct);

        return true;
    }

    private static BookDto ToDto(Book book) =>
        new(
            book.Id,
            book.Title,
            book.Author,
            book.Isbn,
            book.PublicationYear,
            book.Genre,
            book.Description,
            book.CoverImageUrl,
            book.AddedAt);

    private static BookListDto ToListDto(Book book) =>
        new(
            book.Id,
            book.Title,
            book.Author,
            book.Genre,
            book.CoverImageUrl);

    private static string? NormalizeGenre(string? genre)
    {
        if (string.IsNullOrWhiteSpace(genre))
        {
            return genre?.Trim();
        }

        return CultureInfo.CurrentCulture.TextInfo.ToTitleCase(genre.Trim().ToLowerInvariant());
    }

    private static void ValidateTitle(string title)
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            throw new ArgumentException("Title is required.", nameof(title));
        }
    }

    private static void ValidateAuthor(string author)
    {
        if (string.IsNullOrWhiteSpace(author))
        {
            throw new ArgumentException("Author is required.", nameof(author));
        }
    }

    private static void ValidatePublicationYear(int? year)
    {
        if (year is null)
        {
            return;
        }

        var maxYear = DateTime.UtcNow.Year + MaxPublicationYearOffset;
        if (year < MinPublicationYear || year > maxYear)
        {
            throw new ArgumentException(
                $"Publication year must be between {MinPublicationYear} and {maxYear}.",
                nameof(year));
        }
    }

    private async Task TryGenerateEmbeddingAsync(Book book, CancellationToken ct)
    {
        var searchableText = BuildSearchableText(book);
        if (string.IsNullOrWhiteSpace(searchableText))
        {
            return;
        }

        try
        {
            var vector = await _embeddingService.GenerateEmbeddingAsync(searchableText, ct);
            await _books.UpsertEmbeddingAsync(book.Id, vector, EmbeddingModel, vector.Length, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Failed to generate embedding for book {BookId}, continuing without embedding",
                book.Id);
        }
    }

    private static string BuildSearchableText(Book book)
    {
        var parts = new[] { book.Title, book.Author, book.Genre, book.Description };
        return string.Join(" ", parts.Where(p => !string.IsNullOrWhiteSpace(p)));
    }
}
