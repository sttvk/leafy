using System.Security.Claims;
using Lms.Application.Books;
using Lms.Application.Common;
using Lms.Application.Search;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;

namespace Lms.Api.Controllers;

[ApiController]
[Route("api/books")]
public sealed class BooksController : ControllerBase
{
    private static readonly TimeSpan DescriptionCacheDuration = TimeSpan.FromHours(1);

    private readonly BookService _bookService;
    private readonly SearchService _searchService;
    private readonly ITextGenerationService _textGenerationService;
    private readonly IMemoryCache _cache;

    public BooksController(
        BookService bookService,
        SearchService searchService,
        ITextGenerationService textGenerationService,
        IMemoryCache cache)
    {
        _bookService = bookService;
        _searchService = searchService;
        _textGenerationService = textGenerationService;
        _cache = cache;
    }

    [HttpGet("search")]
    public async Task<ActionResult<SearchResponse>> SearchBooks(
        [FromQuery] string q,
        [FromQuery] int limit = 25,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(q))
        {
            return BadRequest("Query parameter 'q' is required.");
        }

        var response = await _searchService.SearchAsync(q, limit, ct);
        return Ok(response);
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<BookListDto>>> ListBooks(
        int? page,
        int? pageSize,
        CancellationToken ct)
    {
        var result = await _bookService.ListAsync(page, pageSize, ct);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<BookDto>> GetBook(Guid id, CancellationToken ct)
    {
        var book = await _bookService.GetByIdAsync(id, ct);
        return book is not null
            ? Ok(book)
            : NotFound();
    }

    [HttpPost]
    [Authorize(Roles = "Librarian")]
    public async Task<ActionResult<BookDto>> CreateBook(
        CreateBookRequest request,
        CancellationToken ct)
    {
        try
        {
            var book = await _bookService.CreateAsync(request, ct);
            return Created($"/api/books/{book.Id}", book);
        }
        catch (ArgumentException ex)
        {
            ModelState.AddModelError(ex.ParamName ?? "request", ex.Message);
            return ValidationProblem(ModelState);
        }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Librarian")]
    public async Task<ActionResult<BookDto>> UpdateBook(
        Guid id,
        UpdateBookRequest request,
        CancellationToken ct)
    {
        try
        {
            var book = await _bookService.UpdateAsync(id, request, ct);
            return book is not null
                ? Ok(book)
                : NotFound();
        }
        catch (ArgumentException ex)
        {
            ModelState.AddModelError(ex.ParamName ?? "request", ex.Message);
            return ValidationProblem(ModelState);
        }
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Librarian")]
    public async Task<IActionResult> DeleteBook(Guid id, CancellationToken ct)
    {
        var deleted = await _bookService.DeleteAsync(id, ct);
        return deleted
            ? NoContent()
            : NotFound();
    }

    [HttpGet("{id:guid}/content")]
    [Authorize]
    public async Task<ActionResult<BookPageResponse>> GetBookContentAsync(
        Guid id, [FromQuery] int page = 1, CancellationToken ct = default)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");

        if (userIdClaim is null || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        var result = await _bookService.GetBookPageAsync(id, userId, page, ct);

        return result is not null
            ? Ok(result)
            : Forbid();
    }

    [HttpGet("{id:guid}/description")]
    public async Task<ActionResult<BookDescriptionResponse>> GetGeneratedDescriptionAsync(
        Guid id, CancellationToken ct)
    {
        var cacheKey = $"book-description-{id}";
        var description = await _cache.GetOrCreateAsync(cacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = DescriptionCacheDuration;

            var book = await _bookService.GetByIdAsync(id, ct);
            if (book is null)
            {
                return null;
            }

            return await _textGenerationService.GenerateBookDescriptionAsync(
                book.Title, book.Author, book.Genre, ct);
        });

        return description is not null
            ? Ok(new BookDescriptionResponse(description))
            : NotFound();
    }
}
