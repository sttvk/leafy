using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Lms.Application.Search;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Lms.Infrastructure.Services;

internal sealed class GeminiEmbeddingService : IEmbeddingService
{
    private const string ModelName = "models/gemini-embedding-001";
    private const string BaseUrl = "https://generativelanguage.googleapis.com/v1beta";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private readonly HttpClient _httpClient;
    private readonly ILogger<GeminiEmbeddingService> _logger;
    private readonly string _apiKey;

    public GeminiEmbeddingService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<GeminiEmbeddingService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;

        _apiKey = configuration["Gemini:ApiKey"]
            ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY")
            ?? throw new InvalidOperationException("Missing Gemini:ApiKey configuration.");
    }

    public async Task<float[]> GenerateEmbeddingAsync(string text, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            throw new ArgumentException("Text must not be empty.", nameof(text));
        }

        var request = new EmbedContentRequest(
            ModelName,
            new ContentPayload([new TextPart(text)]));

        var url = $"{BaseUrl}/models/gemini-embedding-001:embedContent?key={_apiKey}";

        using var response = await _httpClient.PostAsJsonAsync(url, request, JsonOptions, ct);

        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<EmbedContentResponse>(JsonOptions, ct);

        if (result?.Embedding?.Values is null || result.Embedding.Values.Length == 0)
        {
            throw new InvalidOperationException("Gemini returned empty embedding response.");
        }

        _logger.LogDebug(
            "Generated embedding with {Dimensions} dimensions for text of length {TextLength}",
            result.Embedding.Values.Length,
            text.Length);

        return result.Embedding.Values;
    }

    public async Task<IReadOnlyList<float[]>> GenerateEmbeddingsBatchAsync(
        IReadOnlyList<string> texts, CancellationToken ct)
    {
        if (texts is null || texts.Count == 0)
        {
            throw new ArgumentException("Texts must not be empty.", nameof(texts));
        }

        var requests = texts
            .Select(t => new EmbedContentRequest(
                ModelName,
                new ContentPayload([new TextPart(t)])))
            .ToList();

        var batchRequest = new BatchEmbedContentsRequest(requests);

        var url = $"{BaseUrl}/models/gemini-embedding-001:batchEmbedContents?key={_apiKey}";

        using var response = await _httpClient.PostAsJsonAsync(url, batchRequest, JsonOptions, ct);

        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<BatchEmbedContentsResponse>(JsonOptions, ct);

        if (result?.Embeddings is null || result.Embeddings.Count != texts.Count)
        {
            throw new InvalidOperationException(
                $"Gemini returned {result?.Embeddings?.Count ?? 0} embeddings for {texts.Count} inputs.");
        }

        var embeddings = result.Embeddings
            .Select(e => e.Values)
            .ToArray();

        _logger.LogDebug(
            "Generated {Count} embeddings with {Dimensions} dimensions each",
            embeddings.Length,
            embeddings[0].Length);

        return embeddings;
    }

    // Request DTOs
    private sealed record TextPart(
        [property: JsonPropertyName("text")] string Text);

    private sealed record ContentPayload(
        [property: JsonPropertyName("parts")] IReadOnlyList<TextPart> Parts);

    private sealed record EmbedContentRequest(
        [property: JsonPropertyName("model")] string Model,
        [property: JsonPropertyName("content")] ContentPayload Content);

    private sealed record BatchEmbedContentsRequest(
        [property: JsonPropertyName("requests")] IReadOnlyList<EmbedContentRequest> Requests);

    // Response DTOs
    private sealed class EmbeddingValues
    {
        [JsonPropertyName("values")]
        public float[] Values { get; init; } = [];
    }

    private sealed class EmbedContentResponse
    {
        [JsonPropertyName("embedding")]
        public EmbeddingValues? Embedding { get; init; }
    }

    private sealed class BatchEmbedContentsResponse
    {
        [JsonPropertyName("embeddings")]
        public List<EmbeddingValues> Embeddings { get; init; } = [];
    }
}
