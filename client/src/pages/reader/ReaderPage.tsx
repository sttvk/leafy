import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { MESSAGES } from "@/lib/messages"
import { fetchBook, fetchBookPage } from "@/api/books"
import { fetchMyCheckouts, returnBook } from "@/api/checkouts"
import type { CheckoutDto } from "@/api/checkouts"
import { Button } from "@/components/ui/button"
import { PageLayout } from "@/components/PageLayout"
import { daysRemaining } from "@/lib/dates"

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
    (c) => c.bookId === bookId && c.status === "Active"
  )

  const hasOverdueCheckout: boolean =
    activeCheckout == null &&
    checkouts?.some(
      (c) => c.bookId === bookId && c.status === "Overdue"
    ) === true

  const {
    data: pageData,
    isLoading: isPageLoading,
    isError: isPageError,
  } = useQuery({
    queryKey: ["book-content", bookId, currentPage],
    queryFn: () => fetchBookPage(bookId!, currentPage),
    enabled: bookId != null && activeCheckout != null && !isReturned,
  })

  useEffect(() => {
    pageContentRef.current?.scrollTo(0, 0)
  }, [currentPage])

  const isLoading = isCheckoutsLoading || isBookLoading
  const isError = isCheckoutsError || isBookError

  const totalPages = pageData?.totalPages ?? 300
  const paragraphs = pageData?.content.split("\n\n") ?? []

  const handleReturn = useCallback(async () => {
    if (activeCheckout == null) return

    const confirmed = window.confirm("Are you sure you want to return this book? You will lose access to it.")
    if (!confirmed) return

    setIsReturning(true)
    try {
      await returnBook(activeCheckout.id)
      setIsReturned(true)
      await queryClient.invalidateQueries({ queryKey: ["my-checkouts"] })
      toast.success(MESSAGES.returns.success)
    } catch {
      toast.error(MESSAGES.returns.failed)
    } finally {
      setIsReturning(false)
    }
  }, [activeCheckout, queryClient])

  const handlePreviousPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(1, prev - 1))
  }, [])

  const handleNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
  }, [totalPages])

  if (isLoading) {
    return (
      <PageLayout className="py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 rounded bg-muted" />
          <div className="h-4 w-1/4 rounded bg-muted" />
          <div className="mt-8 h-96 rounded-lg bg-muted" />
        </div>
      </PageLayout>
    )
  }

  if (isError) {
    return (
      <PageLayout className="py-24 text-center">
        <p className="text-lg font-medium text-foreground">
          Something went wrong
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Could not load the book. Please try again later.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Back to catalog</Link>
        </Button>
      </PageLayout>
    )
  }

  if (activeCheckout == null && !isReturned) {
    return (
      <PageLayout className="py-24 text-center">
        {hasOverdueCheckout ? (
          <>
            <p className="text-lg font-medium text-foreground">
              Your rental has expired
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Your rental has expired. Rent again to continue reading.
            </p>
          </>
        ) : (
          <>
            <p className="text-lg font-medium text-foreground">
              You don&apos;t have access to this book
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              You need to check it out first.
            </p>
          </>
        )}
        <Button asChild className="mt-6">
          <Link to="/">Back to catalog</Link>
        </Button>
      </PageLayout>
    )
  }

  return (
    <PageLayout className="flex h-[calc(100vh-4rem)] flex-col space-y-3 py-0">
      <section className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-3 py-0">
        <Link to="/" className="icon-btn" aria-label="Back to catalog">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="truncate text-base sm:text-lg font-bold tracking-tight text-foreground">
          {book?.title}
        </h1>
        <span className="hidden sm:inline text-sm text-muted-foreground">{book?.author}</span>
        {book?.genre != null && book.genre !== "" && (
          <span className="hidden sm:inline-block rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
            {book.genre}
          </span>
        )}
        {activeCheckout != null && !isReturned && (() => {
          const days = daysRemaining(activeCheckout.dueAt)
          return (
            <>
              <span className="hidden sm:inline text-muted-foreground">|</span>
              {days > 0 ? (
                <span className="hidden sm:inline text-sm text-muted-foreground">
                  {days} {days === 1 ? "day" : "days"} remaining
                </span>
              ) : days === 0 ? (
                <span className="hidden sm:inline text-sm font-medium text-warning">
                  Due today
                </span>
              ) : (
                <span className="hidden sm:inline text-sm font-medium text-destructive">
                  Overdue
                </span>
              )}
            </>
          )
        })()}
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
        className={`min-h-0 flex-1 overflow-y-auto bg-card p-4 sm:p-8 ${
          isReturned ? "pointer-events-none opacity-50" : ""
        }`}
      >
        <div className="prose prose-lg mx-auto max-w-none sm:max-w-prose font-serif text-foreground">
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
              Page {currentPage}
            </span>
            <hr className="flex-1 border-border" />
          </div>
          {isPageLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-4 w-full rounded bg-muted" />
              <div className="h-4 w-5/6 rounded bg-muted" />
              <div className="h-4 w-4/6 rounded bg-muted" />
              <div className="h-4 w-full rounded bg-muted" />
            </div>
          ) : isPageError ? (
            <p className="text-sm text-destructive">
              Access denied. You may no longer have an active checkout for this book.
            </p>
          ) : (
            paragraphs.map((paragraph, idx) => (
              <p key={idx} className="mb-4 leading-relaxed">
                {paragraph}
              </p>
            ))
          )}
        </div>
      </section>

      <nav className="flex flex-wrap shrink-0 items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={handlePreviousPage}
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={handleNextPage}
        >
          Next
        </Button>
      </nav>
    </PageLayout>
  )
}

export { ReaderPage }
