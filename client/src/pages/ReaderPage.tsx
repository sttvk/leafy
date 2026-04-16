import { useCallback, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { fetchBook } from "@/api/books"
import { fetchMyCheckouts, returnBook } from "@/api/checkouts"
import type { CheckoutDto } from "@/api/checkouts"
import { Button } from "@/components/ui/button"
import { generatePage, TOTAL_PAGES } from "@/lib/lorem"

function ReaderPage() {
  const { bookId } = useParams<{ bookId: string }>()
  const queryClient = useQueryClient()
  const [isReturning, setIsReturning] = useState(false)
  const [isReturned, setIsReturned] = useState(false)

  const {
    data: checkouts,
    isLoading: isCheckoutsLoading,
    isError: isCheckoutsError,
  } = useQuery({
    queryKey: ["my-checkouts"],
    queryFn: fetchMyCheckouts,
  })

  const {
    data: book,
    isLoading: isBookLoading,
    isError: isBookError,
  } = useQuery({
    queryKey: ["book", bookId],
    queryFn: () => fetchBook(bookId!),
    enabled: bookId != null,
  })

  const activeCheckout: CheckoutDto | undefined = checkouts?.find(
    (c) =>
      c.bookId === bookId &&
      (c.status === "Active" || c.status === "Overdue")
  )

  const pages = useMemo(
    () =>
      Array.from({ length: TOTAL_PAGES }, (_, i) => ({
        number: i + 1,
        paragraphs: generatePage(i + 1).split("\n\n"),
      })),
    []
  )

  const isLoading = isCheckoutsLoading || isBookLoading
  const isError = isCheckoutsError || isBookError

  const handleReturn = useCallback(async () => {
    if (activeCheckout == null) return

    setIsReturning(true)
    try {
      await returnBook(activeCheckout.id)
      setIsReturned(true)
      await queryClient.invalidateQueries({ queryKey: ["my-checkouts"] })
    } catch {
      window.alert("Failed to return the book. Please try again.")
    } finally {
      setIsReturning(false)
    }
  }, [activeCheckout, queryClient])

  if (isLoading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 rounded bg-muted" />
          <div className="h-4 w-1/4 rounded bg-muted" />
          <div className="mt-8 h-96 rounded-lg bg-muted" />
        </div>
      </main>
    )
  }

  if (isError) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 lg:px-8">
        <p className="text-lg font-medium text-foreground">
          Something went wrong
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Could not load the book. Please try again later.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Back to catalog</Link>
        </Button>
      </main>
    )
  }

  if (activeCheckout == null && !isReturned) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 lg:px-8">
        <p className="text-lg font-medium text-foreground">
          You don&apos;t have access to this book
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          You need to check it out first.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Back to catalog</Link>
        </Button>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-6 space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {book?.title}
        </h1>
        <p className="text-lg text-muted-foreground">{book?.author}</p>
        {book?.genre != null && book.genre !== "" && (
          <span className="inline-block rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {book.genre}
          </span>
        )}
      </section>

      {isReturned && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          Book returned successfully.
        </div>
      )}

      <section
        className={`rounded-lg border border-border bg-card p-8 shadow-sm ${
          isReturned ? "pointer-events-none opacity-50" : ""
        }`}
      >
        <div className="prose prose-lg max-w-none font-serif text-foreground">
          {book?.description != null && book.description !== "" && (
            <div className="mb-8 border-b border-border pb-8">
              <p className="whitespace-pre-line leading-relaxed italic text-muted-foreground">
                {book.description}
              </p>
            </div>
          )}

          {pages.map((page) => (
            <div key={page.number}>
              <div className="my-8 flex items-center gap-4">
                <hr className="flex-1 border-border" />
                <span className="text-xs font-medium tracking-wide text-muted-foreground">
                  Page {page.number}
                </span>
                <hr className="flex-1 border-border" />
              </div>
              {page.paragraphs.map((paragraph, idx) => (
                <p key={idx} className="mb-4 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          ))}
        </div>
      </section>

      {!isReturned && (
        <div className="mt-6 flex justify-end">
          <Button
            variant="destructive"
            disabled={isReturning}
            onClick={handleReturn}
          >
            {isReturning ? "Returning..." : "Return Book"}
          </Button>
        </div>
      )}
    </main>
  )
}

export { ReaderPage }
