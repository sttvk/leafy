import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
  const [currentPage, setCurrentPage] = useState(1)
  const pageContentRef = useRef<HTMLDivElement>(null)

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

  const currentPageData = useMemo(
    () => ({
      number: currentPage,
      paragraphs: generatePage(currentPage).split("\n\n"),
    }),
    [currentPage]
  )

  useEffect(() => {
    pageContentRef.current?.scrollTo(0, 0)
  }, [currentPage])

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

  const handlePreviousPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(1, prev - 1))
  }, [])

  const handleNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(TOTAL_PAGES, prev + 1))
  }, [])

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
    <main className="flex h-[calc(100vh-4rem)] flex-col px-4 sm:px-6 lg:px-8">
      <section className="flex shrink-0 items-center gap-3 border-b border-border py-3">
        <h1 className="text-lg font-bold tracking-tight text-foreground">
          {book?.title}
        </h1>
        <span className="text-sm text-muted-foreground">{book?.author}</span>
        {book?.genre != null && book.genre !== "" && (
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
            {book.genre}
          </span>
        )}
        {isReturned && (
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-950 dark:text-green-200">
            Returned
          </span>
        )}
        {!isReturned && (
          <Button
            variant="destructive"
            size="sm"
            className="ml-auto"
            disabled={isReturning}
            onClick={handleReturn}
          >
            {isReturning ? "Returning..." : "Return Book"}
          </Button>
        )}
      </section>

      <section
        ref={pageContentRef}
        className={`min-h-0 flex-1 overflow-y-auto rounded-lg border border-border bg-card p-8 shadow-sm ${
          isReturned ? "pointer-events-none opacity-50" : ""
        }`}
      >
        <div className="prose prose-lg mx-auto max-w-3xl font-serif text-foreground">
          {currentPage === 1 &&
            book?.description != null &&
            book.description !== "" && (
              <div className="mb-8 border-b border-border pb-8">
                <p className="whitespace-pre-line leading-relaxed italic text-muted-foreground">
                  {book.description}
                </p>
              </div>
            )}

          <div className="mb-6 flex items-center gap-4">
            <hr className="flex-1 border-border" />
            <span className="text-xs font-medium tracking-wide text-muted-foreground">
              Page {currentPageData.number}
            </span>
            <hr className="flex-1 border-border" />
          </div>
          {currentPageData.paragraphs.map((paragraph, idx) => (
            <p key={idx} className="mb-4 leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      <nav className="flex shrink-0 items-center justify-between border-t border-border py-3">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={handlePreviousPage}
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {currentPage} of {TOTAL_PAGES}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= TOTAL_PAGES}
          onClick={handleNextPage}
        >
          Next
        </Button>
      </nav>
    </main>
  )
}

export { ReaderPage }
