namespace Lms.Application.Books;

public interface ITextGenerationService
{
    Task<string> GenerateBookDescriptionAsync(
        string title, string author, string? genre, CancellationToken ct);

    Task<string> GenerateTextAsync(string prompt, CancellationToken ct);
}
