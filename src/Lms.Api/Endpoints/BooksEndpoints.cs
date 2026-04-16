using Lms.Application.Books;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Lms.Api.Endpoints;

public static class BooksEndpoints
{
    public static RouteGroupBuilder MapBooksEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/books")
            .WithTags("Books");

        group.MapGet("/", ListBooksAsync)
            .WithName("ListBooks");

        group.MapGet("/{id:guid}", GetBookAsync)
            .WithName("GetBook");

        group.MapPost("/", CreateBookAsync)
            .WithName("CreateBook")
            .RequireAuthorization(p => p.RequireRole("Librarian"));

        group.MapPut("/{id:guid}", UpdateBookAsync)
            .WithName("UpdateBook")
            .RequireAuthorization(p => p.RequireRole("Librarian"));

        group.MapDelete("/{id:guid}", DeleteBookAsync)
            .WithName("DeleteBook")
            .RequireAuthorization(p => p.RequireRole("Librarian"));

        return group;
    }

    private static async Task<Ok<Application.Common.PagedResult<BookListDto>>> ListBooksAsync(
        BookService bookService,
        int? page,
        int? pageSize,
        CancellationToken ct)
    {
        var result = await bookService.ListAsync(page, pageSize, ct);
        return TypedResults.Ok(result);
    }

    private static async Task<Results<Ok<BookDto>, NotFound>> GetBookAsync(
        Guid id,
        BookService bookService,
        CancellationToken ct)
    {
        var book = await bookService.GetByIdAsync(id, ct);
        return book is not null
            ? TypedResults.Ok(book)
            : TypedResults.NotFound();
    }

    private static async Task<Results<Created<BookDto>, ValidationProblem>> CreateBookAsync(
        CreateBookRequest request,
        BookService bookService,
        CancellationToken ct)
    {
        try
        {
            var book = await bookService.CreateAsync(request, ct);
            return TypedResults.Created($"/api/books/{book.Id}", book);
        }
        catch (ArgumentException ex)
        {
            return TypedResults.ValidationProblem(
                new Dictionary<string, string[]>
                {
                    [ex.ParamName ?? "request"] = [ex.Message]
                });
        }
    }

    private static async Task<Results<Ok<BookDto>, NotFound, ValidationProblem, Conflict<string>>> UpdateBookAsync(
        Guid id,
        UpdateBookRequest request,
        BookService bookService,
        CancellationToken ct)
    {
        try
        {
            var book = await bookService.UpdateAsync(id, request, ct);
            return book is not null
                ? TypedResults.Ok(book)
                : TypedResults.NotFound();
        }
        catch (ArgumentException ex)
        {
            return TypedResults.ValidationProblem(
                new Dictionary<string, string[]>
                {
                    [ex.ParamName ?? "request"] = [ex.Message]
                });
        }
        catch (InvalidOperationException ex)
        {
            return TypedResults.Conflict(ex.Message);
        }
    }

    private static async Task<Results<NoContent, NotFound>> DeleteBookAsync(
        Guid id,
        BookService bookService,
        CancellationToken ct)
    {
        var deleted = await bookService.DeleteAsync(id, ct);
        return deleted
            ? TypedResults.NoContent()
            : TypedResults.NotFound();
    }
}
