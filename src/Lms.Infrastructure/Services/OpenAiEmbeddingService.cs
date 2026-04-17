using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Lms.Application.Search;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Lms.Infrastructure.Services;

internal sealed class OpenAiEmbeddingService : IEmbeddingService
{
    private const string ModelName = "text-embedding-3-small";
    private const string Endpoint = "https://api.openai.com/v1/embeddings";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private readonly HttpClient _httpClient;
    private readonly ILogger<OpenAiEmbeddingService> _logger;

    public OpenAiEmbeddingService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<OpenAiEmbeddingService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;

        var apiKey = configuration["OpenAI:ApiKey"]
            ?? throw new InvalidOperationException("Missing OpenAI:ApiKey configuration.");

        _httpClient.BaseAddress = new Uri(Endpoint);
        _httpClient.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);
    }

    public async Task<float[]> GenerateEmbeddingAsync(string text, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            throw new ArgumentException("Text must not be empty.", nameof(text));
        }

        var request = new EmbeddingRequest(text, ModelName);

        using var response = await _httpClient.PostAsJsonAsync(
            Endpoint, request, JsonOptions, ct);

        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<EmbeddingResponse>(JsonOptions, ct);

        if (result?.Data is null || result.Data.Count == 0)
        {
            throw new InvalidOperationException("OpenAI returned empty embedding response.");
        }

        _logger.LogDebug(
            "Generated embedding with {Dimensions} dimensions for text of length {TextLength}",
            result.Data[0].Embedding.Length,
            text.Length);

        return result.Data[0].Embedding;
    }

    private sealed record EmbeddingRequest(
        [property: JsonPropertyName("input")] string Input,
        [property: JsonPropertyName("model")] string Model);

    private sealed class EmbeddingResponse
    {
        [JsonPropertyName("data")]
        public List<EmbeddingData> Data { get; init; } = [];
    }

    private sealed class EmbeddingData
    {
        [JsonPropertyName("embedding")]
        public float[] Embedding { get; init; } = [];
    }
}
