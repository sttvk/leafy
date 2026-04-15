---
name: react-data-fetching
description: Use when adding or modifying React components that fetch data from the .NET API — enforces TanStack Query, generated client usage, and mandatory loading/error/empty states.
---

# React data fetching

## When to use

- Adding any component that reads from or writes to the API.
- Refactoring a component that uses `useEffect` + `fetch`.
- Implementing checkout, return, or add-book flows.
- Reviewing a PR that touches data fetching code.

## Why it matters

Hand-rolled `useEffect` + `fetch` code reliably reinvents caching, deduplication, and retries — badly. TanStack Query handles all three and integrates with the generated TypeScript client from `api-contract-sync`. Mandating loading, error, and empty states up front prevents the "works on my machine with instant localhost" class of bugs from reaching users who hit the Azure SQL Free cold start.

## Procedure

1. All data access goes through `@tanstack/react-query`. Set up one `QueryClient` at the root with `staleTime: 30_000` and `retry: 2`.
2. Use query keys as tuples with a literal first segment and a params object:
   ```ts
   useQuery({
     queryKey: ['books', { search, page }],
     queryFn: () => api.books.list({ search, page }),
   });
   ```
3. The `api` object is the typed wrapper over `src/api/generated.ts`. Never hand-write `fetch('/api/books')`.
4. Every component that calls `useQuery` must render three states: loading skeleton, error with retry button, and empty with an action (e.g., "No books match. Clear filters."). No exceptions — block code review otherwise.
5. Writes use `useMutation` with `onSuccess: () => queryClient.invalidateQueries({ queryKey: ['books'] })`. For checkout and return, layer `onMutate` optimistic updates so the UI feels instant; roll back in `onError`.
6. Use one `<Suspense>` boundary per route (in the router config), not per component. Per-component suspense fragments the loading experience.
7. Prefetch on hover for the book detail route: `queryClient.prefetchQuery` in a link's `onMouseEnter`.

## Failure modes

- Skipping the empty state — users with no results see a blank screen and assume the app is broken.
- Hand-writing `fetch` — bypasses the generated client and loses type safety.
- Invalidating with too-narrow a key after a mutation — other views show stale data.
- Per-component `<Suspense>` — half the page flashes while the other half waits.

## References

- https://tanstack.com/query/latest/docs/framework/react/overview
- https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates
