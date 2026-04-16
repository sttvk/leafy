import { useQuery } from "@tanstack/react-query"
import { Loader2, ShoppingCart } from "lucide-react"
import { fetchBook, type BookListDto } from "@/api/books"
import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface BookDetailOverlayProps {
  book: BookListDto | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onBorrow?: () => void
  onEdit?: () => void
}

const PLACEHOLDER_COVER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300' fill='%23e5e7eb'%3E%3Crect width='200' height='300'/%3E%3C/svg%3E"

function BookDetailOverlay({ book, open, onOpenChange, onBorrow, onEdit }: BookDetailOverlayProps) {
  const { isAuthenticated, isLibrarian } = useAuth()

  const { data: detail, isLoading } = useQuery({
    queryKey: ["book-detail", book?.id],
    queryFn: () => fetchBook(book!.id),
    enabled: open && book != null,
  })

  const isAvailable = book != null && book.availableCopies > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="book-detail-flip-in h-[70vh] w-[95vw] max-w-5xl p-0 sm:p-0">
        {book == null ? null : isLoading || detail == null ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            {/* Accessible title for screen readers while loading */}
            <DialogHeader className="sr-only">
              <DialogTitle>Loading book details</DialogTitle>
              <DialogDescription>Please wait while book details are fetched.</DialogDescription>
            </DialogHeader>
          </div>
        ) : (
          <div className="flex h-full flex-col sm:flex-row">
            {/* Left: cover image */}
            <div className="relative flex-shrink-0 overflow-hidden sm:w-80 sm:rounded-l-lg lg:w-96">
              <img
                src={detail.coverImageUrl ?? PLACEHOLDER_COVER}
                alt={`Cover of ${detail.title}`}
                className="h-64 w-full object-cover sm:h-full sm:max-h-[70vh]"
              />
            </div>

            {/* Right: details */}
            <div className="flex h-full flex-1 flex-col gap-4 p-6">
              <DialogHeader className="space-y-2 text-left">
                <DialogTitle className="text-xl font-bold leading-tight sm:text-3xl">
                  {detail.title}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  by {detail.author}
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-wrap items-center gap-2">
                {detail.genre && (
                  <span className="inline-block rounded-full bg-secondary px-3 py-0.5 text-xs font-medium text-secondary-foreground">
                    {detail.genre}
                  </span>
                )}
                {detail.publicationYear != null && (
                  <span className="text-xs text-muted-foreground">
                    {detail.publicationYear}
                  </span>
                )}
              </div>

              {detail.isbn && (
                <p className="text-xs text-muted-foreground">
                  ISBN: {detail.isbn}
                </p>
              )}

              {/* Availability indicator */}
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-block h-2.5 w-2.5 rounded-full",
                    isAvailable ? "bg-green-500" : "bg-red-500"
                  )}
                />
                <span className="text-sm text-foreground">
                  {detail.availableCopies} of {detail.totalCopies} copies available
                </span>
              </div>

              {/* Description */}
              {detail.description && (
                <div className="min-h-0 flex-1 overflow-y-auto text-sm leading-relaxed text-muted-foreground">
                  {detail.description}
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-auto flex flex-col gap-3 pt-2">
                {isAuthenticated && onBorrow && isAvailable && (
                  <Button
                    size="lg"
                    className="w-full text-base"
                    onClick={() => {
                      onBorrow()
                      onOpenChange(false)
                    }}
                  >
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Add to Cart
                  </Button>
                )}
                {isLibrarian && onEdit && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      onEdit()
                      onOpenChange(false)
                    }}
                  >
                    Edit
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export { BookDetailOverlay }
