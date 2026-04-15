---
name: hybrid-search-tuning
description: Use when designing, implementing, or tuning the hybrid full-text plus vector search over the library catalog, including reciprocal rank fusion and the relevance regression fixture.
---

# Hybrid search tuning

## When to use

- Implementing the initial search endpoint.
- Tuning poor results reported by a user or in manual testing.
- Adding a new searchable field (e.g., subject tags).
- Reviewing a change to search ranking, query parsing, or the embedding pipeline.

## Why it matters

Pure full-text search misses "books about quantum computing for beginners" because the exact tokens rarely appear. Pure vector search misses "ISBN 978-0-13-468599-1" because numbers don't embed meaningfully. Hybrid search catches both, but only if the fusion is deterministic and there is a regression fixture. Without fixtures, search quality rots silently — a change to the prompt, the model, or the FTS catalog quietly breaks a previously-working query and no one notices until a user complains.

## Procedure

1. Full-text side: create a SQL Server full-text catalog on `Books(Title, Authors, Isbn, Description)`. Query with `CONTAINS` or `FREETEXT` and return the top 50 with their rank.
2. Vector side: embed the query once (see `azure-openai-embeddings`), run a cosine-similarity query against the `BookEmbeddings` table, return the top 50 with their rank. For scale this small, an in-process cosine loop over all rows is acceptable; switch to SQL Server 2025 vector functions if they land on the Free tier.
3. Fuse with reciprocal rank fusion: for each document, `score = sum(1 / (k + rank_i))` across the lists it appears in, with `k = 60`. Sort descending. Return the top 20.
4. Parse the query: if it matches an ISBN regex, skip the vector path entirely and go FTS-only — saves one embedding call per keystroke.
5. Debounce the client-side search input by 300ms. Do not issue a query per keystroke.
6. Keep a fixture at `tests/search-relevance.json`:
   ```json
   [
     { "query": "quantum computing beginner", "expect_top3_contains": ["Q-Is-for-Quantum"] },
     { "query": "9780134685991", "expect_rank1": "Effective Java 3rd" }
   ]
   ```
   A CI test runs each query and asserts the expectations. Failing a case blocks the merge.
7. When tuning, change one variable at a time (k, top-N per side, embedding model) and re-run the fixture.

## Failure modes

- Normalizing scores across FTS and vector by min-max before fusing — non-monotonic results across queries. Use RRF, which only needs ranks.
- Embedding the query on every keystroke — see `azure-openai-embeddings`; debounce and cache.
- No fixture — every tuning change is a guess.
- FTS-only for semantic queries or vector-only for ISBNs — each half misses its blind spot.

## References

- https://learn.microsoft.com/en-us/sql/relational-databases/search/full-text-search
- https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf
