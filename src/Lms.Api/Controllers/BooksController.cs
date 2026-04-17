using Lms.Application.Books;
using Lms.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Lms.Api.Controllers;

[ApiController]
[Route("api/books")]
public sealed class BooksController : ControllerBase
{
    private readonly BookService _bookService;

    public BooksController(BookService bookService)
    {
        _bookService = bookService;
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
}
