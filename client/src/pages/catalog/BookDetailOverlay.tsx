import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { BookOpen, Check, Loader2, ShoppingCart, Trash2 } from "lucide-react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { MESSAGES } from "@/lib/messages"
import { deleteBook, fetchBook, fetchBookDescription, type BookListDto } from "@/api/books"
import { fetchMyCheckouts } from "@/api/checkouts"
import { useAuth } from "@/contexts/AuthContext"
import { useCart } from "@/contexts/CartContext"
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
  onEdit?: () => void
  onDelete?: () => void
}

const PLACEHOLDER_COVER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300' fill='%23e5e7eb'%3E%3Crect width='200' height='300'/%3E%3C/svg%3E"

function BookDetailOverlay({ book, open, onOpenChange, onEdit, onDelete }: BookDetailOverlayProps) {
  const { isAuthenticated, isLibrarian } = useAuth()
  const { addToCart, isInCart } = useCart()
  const [isDeleting, setIsDeleting] = useState(false)

  const { data: myCheckouts } = useQuery({
    queryKey: ["my-checkouts"],
    queryFn: fetchMyCheckouts,
    enabled: isAuthenticated,
  })

  const isAlreadyCheckedOut = myCheckouts?.some(
    (c) => c.bookId === book?.id && (c.status === "Active" || c.status === "Overdue")
  ) ?? false

  const isAlreadyInCart = book != null && isInCart(book.id)

  async function handleDelete(): Promise<void> {
    if (book == null) return
    const confirmed = window.confirm(MESSAGES.books.deleteConfirm)
    if (!confirmed) return

    setIsDeleting(true)
    try {
      await deleteBook(book.id)
      onDelete?.()
      toast.success(MESSAGES.books.deleteSuccess)
      onOpenChange(false)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete book"
      toast.error(message)
    } finally {
      setIsDeleting(false)
    }
  }

  const { data: detail, isLoading } = useQuery({
    queryKey: ["book-detail", book?.id],
    queryFn: () => fetchBook(book!.id),
    enabled: open && book != null,
  })

  const { data: aiDescription, isLoading: isDescriptionLoading } = useQuery({
    queryKey: ["book-description", book?.id],
    queryFn: () => fetchBookDescription(book!.id),
    enabled: open && book != null,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="book-detail-flip-in flex h-[70vh] w-[95vw] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:p-0">
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
            <div className="flex min-h-0 flex-1 flex-col gap-4 p-8">
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

              {/* Description */}
              <div className="min-h-0 flex-1 overflow-y-auto text-sm leading-relaxed text-muted-foreground">
                {isDescriptionLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Generating description...</span>
                  </div>
                ) : (
                  aiDescription?.description ?? detail.description
                )}
              </div>

              {/* Action buttons */}
              <div className="mt-auto flex flex-col gap-3 pt-2">
                {!isAuthenticated && (
                  <p className="text-center text-sm text-muted-foreground">
                    <Link to="/login" className="font-medium text-primary hover:underline">{MESSAGES.checkout.loginToRead}</Link>
                  </p>
                )}
                {isAuthenticated && book != null && isAlreadyCheckedOut && (
                  <Button
                    size="lg"
                    className="w-full text-base"
                    disabled
                  >
                    <BookOpen className="mr-2 h-5 w-5" />
                    {MESSAGES.checkout.alreadyReading}
                  </Button>
                )}
                {isAuthenticated && book != null && !isAlreadyCheckedOut && (
                  <Button
                    size="lg"
                    className="w-full text-base"
                    disabled={isAlreadyInCart}
                    onClick={() => {
                      addToCart(book)
                    }}
                  >
                    {isAlreadyInCart ? (
                      <>
                        <Check className="mr-2 h-5 w-5" />
                        {MESSAGES.checkout.addedToCart}
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="mr-2 h-5 w-5" />
                        {MESSAGES.checkout.addToCart}
                      </>
                    )}
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
                {isLibrarian && (
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={isDeleting}
                    onClick={handleDelete}
                  >
                    {isDeleting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete Book
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
