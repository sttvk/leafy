using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Lms.Application.Books;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Lms.Infrastructure.Services;

internal sealed class GeminiTextGenerationService : ITextGenerationService
{
    private const string BaseUrl = "https://generativelanguage.googleapis.com/v1beta";
    private const string ModelName = "gemini-2.5-flash";

    private readonly HttpClient _httpClient;
    private readonly ILogger<GeminiTextGenerationService> _logger;
    private readonly string _apiKey;

    public GeminiTextGenerationService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<GeminiTextGenerationService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;

        _apiKey = configuration["Gemini:ApiKey"]
            ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY")
            ?? throw new InvalidOperationException("Missing Gemini:ApiKey configuration.");
    }

    public async Task<string> GenerateBookDescriptionAsync(
        string title, string author, string? genre, CancellationToken ct)
    {
        var genreClause = string.IsNullOrWhiteSpace(genre)
            ? string.Empty
            : $" The genre is {genre}.";

        var prompt =
            $"Write a concise description (under 200 words) of the book '{title}' by {author}.{genreClause}" +
            " Include the setting, genre, and main themes. Do not use markdown formatting.";

        var request = new GenerateContentRequest(
            [new Content([new TextPart(prompt)])]);

        var url = $"{BaseUrl}/models/{ModelName}:generateContent?key={_apiKey}";

        using var response = await _httpClient.PostAsJsonAsync(url, request, ct);

        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<GenerateContentResponse>(ct);

        var text = result?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text;

        if (string.IsNullOrWhiteSpace(text))
        {
            throw new InvalidOperationException("Gemini returned an empty text generation response.");
        }

        _logger.LogDebug(
            "Generated description for book {Title} by {Author}, length {Length}",
            title, author, text.Length);

        return text;
    }

    // Request DTOs
    private sealed record TextPart(
        [property: JsonPropertyName("text")] string Text);

    private sealed record Content(
        [property: JsonPropertyName("parts")] IReadOnlyList<TextPart> Parts);

    private sealed record GenerateContentRequest(
        [property: JsonPropertyName("contents")] IReadOnlyList<Content> Contents);

    // Response DTOs
    private sealed class ResponsePart
    {
        [JsonPropertyName("text")]
        public string? Text { get; init; }
    }

    private sealed class ResponseContent
    {
        [JsonPropertyName("parts")]
        public List<ResponsePart>? Parts { get; init; }
    }

    private sealed class Candidate
    {
        [JsonPropertyName("content")]
        public ResponseContent? Content { get; init; }
    }

    private sealed class GenerateContentResponse
    {
        [JsonPropertyName("candidates")]
        public List<Candidate>? Candidates { get; init; }
    }
}
