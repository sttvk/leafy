---
name: azure-openai-embeddings
description: Use when adding, modifying, or debugging Azure OpenAI embedding generation or semantic search indexing — enforces content-hash caching so free credits are not burned on duplicate work.
---

# Azure OpenAI embeddings

## When to use

- Wiring up the first call to Azure OpenAI from the API.
- Adding a new field or entity that needs an embedding (e.g., review text).
- Diagnosing unexpectedly fast depletion of Azure OpenAI free credits.
- Building or rebuilding the vector index for search.

## Why it matters

Embedding calls are billed per token. The free credit is modest and non-renewable. Re-embedding a book description on every search request or page view will exhaust the credit in one afternoon and then the semantic search feature silently stops working. A content-hash cache in SQL makes the second call to embed the same string free and instant.

## Procedure

1. Model: use `text-embedding-3-small` (1536 dims). It is the cheapest Azure OpenAI embedding model and quality is sufficient for a book catalog.
2. Before calling the service, compute `SHA256(normalizedText)` where normalization is `text.Trim().ToLowerInvariant()` collapsed on whitespace. Store the hex digest as the cache key.
3. Look up the hash in the `BookEmbeddings` table (`Hash CHAR(64) PRIMARY KEY, Vector VARBINARY(MAX), Model NVARCHAR(64), CreatedUtc DATETIME2`).
4. On cache miss: call `AzureOpenAIClient.GetEmbeddingClient("text-embedding-3-small").GenerateEmbedding(text)`. Store the result keyed by hash plus the model name (so a model change invalidates cleanly).
5. Handle 429 with exponential backoff: Polly retry, 5 attempts, base 1s, max 30s. Do not retry 400 or 401.
6. For batch indexing, rate-limit client-side to the free tier's RPM (check portal; assume 60 RPM unless confirmed higher). Use `SemaphoreSlim` or a simple `Channel<string>` consumer.
7. Never call the embedding API from inside a read-path request handler. Embeddings are produced during ingest or a background catalog update, never during a search query for the query itself — embed the query once and cache that too.

## Schema

```sql
CREATE TABLE BookEmbeddings (
  Hash CHAR(64) NOT NULL PRIMARY KEY,
  Model NVARCHAR(64) NOT NULL,
  Vector VARBINARY(MAX) NOT NULL,
  CreatedUtc DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
```

## Failure modes

- Embedding on every GET `/books/{id}` instead of at ingest — credits gone in hours.
- Caching by book ID instead of content hash — editing a description still charges, and identical descriptions across books get charged twice.
- Forgetting to include the model name in the cache key — switching models returns stale vectors.
- Not backing off on 429 — the client spams the endpoint and gets rate-limited harder.

## References

- https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/embeddings
- https://learn.microsoft.com/en-us/dotnet/api/overview/azure/ai.openai-readme
