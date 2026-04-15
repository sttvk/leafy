# Observability

OTEL, logging, and Application Insights conventions for the LMS stack.

## One Place for OTEL Config

- Configure OpenTelemetry only in `Lms.ServiceDefaults`
- Both `Lms.Api` and `Lms.Migrations` reference `Lms.ServiceDefaults`
- Never register exporters, meters, or tracer providers elsewhere

## Consistent Signal Shape

Emit logs, metrics, and traces identically in every environment. Only the exporter endpoint changes:

- Local: Aspire Dashboard via OTLP
- Production: Azure Application Insights (with Log Analytics workspace)

## Span and Activity Naming

- Use `verb.resource` form: `checkout.book`, `search.semantic`, `index.embedding`
- Do NOT encode IDs, user names, or tenant names in span names
- IDs belong in span attributes, never in the name

## Required Attributes

Always attach when available:

- `user.id` — only when authenticated
- `book.id` — any book-scoped operation
- `correlation.id` — every request

Never attach PII beyond `user.id`. No emails, names, addresses, or full request bodies.

## Logging Rules

- Inject `ILogger<T>` — never `Console.WriteLine` or `Console.Error.WriteLine` in app code
- Use structured message templates, never string interpolation into the message:

```csharp
// CORRECT
logger.LogInformation("checked out book {BookId} for {UserId}", bookId, userId);

// WRONG
logger.LogInformation($"checked out book {bookId} for {userId}");
```

Log level guidance:

| Level | Meaning |
|-------|---------|
| Error | Alertable. On-call should look. |
| Warning | Unexpected but recovered. |
| Information | High-value business events only. |
| Debug | Dev-time diagnostic, off in prod. |

## Exceptions: Log or Convert, Never Swallow

A caught exception must either:

1. Be logged with context and rethrown, or
2. Be converted into a domain error with the original attached as `innerException`

Never write `catch { }` or `catch (Exception) { }` with an empty body.

## Health Checks

- `/api/health` must exercise the database (`SELECT 1`), not just return 200
- Include the application version in the response body
- Health checks live in `Lms.ServiceDefaults`

## Sampling

- Dev: 100% sampling
- Prod: probabilistic sampling, start at 10% and tune from real traffic
- Errors and exceptions are always sampled regardless of rate

## Cost Guard

Application Insights grants the first 1 GB per month free; everything after is billable. To stay inside the free tier:

- Do NOT log request bodies or response bodies by default
- Do NOT log at Information level inside hot loops
- Opt in to body capture only for a narrow debugging window

## Trace Propagation

Outbound HTTP calls must carry the `traceparent` header so traces stitch end-to-end:

- Azure OpenAI (embeddings, chat)
- Open Library (catalog enrichment)
- Any other upstream service

Use `HttpClient` configured through DI so the OTEL `HttpClient` instrumentation injects headers automatically.
