using System.Collections.Concurrent;
using Lms.Application.Books;
using Lms.Application.Common;
using Lms.Application.Search;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Lms.Api.Controllers;

[ApiController]
[Route("api/books")]
public sealed class BooksController : ControllerBase
{
    private static readonly ConcurrentDictionary<Guid, string> DescriptionCache = new();

    private readonly BookService _bookService;
    private readonly SearchService _searchService;
    private readonly ITextGenerationService _textGenerationService;

    public BooksController(
        BookService bookService,
        SearchService searchService,
        ITextGenerationService textGenerationService)
    {
        _bookService = bookService;
        _searchService = searchService;
        _textGenerationService = textGenerationService;
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

    [HttpGet("{id:guid}/description")]
    public async Task<ActionResult<BookDescriptionResponse>> GetGeneratedDescriptionAsync(
        Guid id, CancellationToken ct)
    {
        if (DescriptionCache.TryGetValue(id, out var cached))
        {
            return Ok(new BookDescriptionResponse(cached));
        }

        var book = await _bookService.GetByIdAsync(id, ct);
        if (book is null)
        {
            return NotFound();
        }

        var description = await _textGenerationService.GenerateBookDescriptionAsync(
            book.Title, book.Author, book.Genre, ct);

        DescriptionCache.TryAdd(id, description);

        return Ok(new BookDescriptionResponse(description));
    }
}
