import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { BookOpen, Check, Loader2, ShoppingCart, Trash2 } from "lucide-react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { MESSAGES } from "@/lib/messages"
import { deleteBook, fetchBook, fetchBookDescription, type BookListDto } from "@/api/books"
import { useAuth } from "@/contexts/AuthContext"
import { useCart } from "@/contexts/CartContext"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
}

const PLACEHOLDER_COVER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300' fill='%23e5e7eb'%3E%3Crect width='200' height='300'/%3E%3C/svg%3E"

const TYPEWRITER_INTERVAL_MS = 30

function BookDetailOverlay({ book, open, onOpenChange, onEdit }: BookDetailOverlayProps) {
  const { isAuthenticated, isLibrarian } = useAuth()
  const { addToCart, isInCart } = useCart()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [displayedText, setDisplayedText] = useState("")

  const isAlreadyInCart = book != null && isInCart(book.id)

  async function handleDelete(): Promise<void> {
    if (book == null) return

    setIsDeleting(true)
    try {
      await deleteBook(book.id)
      toast.success(MESSAGES.books.deleteSuccess)
      window.location.reload()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete book"
      toast.error(message)
    } finally {
      setIsDeleting(false)
    }
  }

  const { data: detail, isLoading } = useQuery({
    queryKey: ["book-detail", book?.id],
    queryFn: () => fetchBook(book?.id ?? ""),
    enabled: open && book != null,
  })

  const { data: aiDescription, isLoading: isDescriptionLoading, isError: isDescriptionError } = useQuery({
    queryKey: ["book-description", book?.id],
    queryFn: () => fetchBookDescription(book?.id ?? ""),
    enabled: open && book != null,
    retry: false,
  })

  // Reset typewriter when modal closes or book changes
  useEffect(() => {
    setDisplayedText("")
  }, [book?.id, open])

  // Typewriter effect: add one word at a time when AI description arrives
  useEffect(() => {
    const fullText = aiDescription?.description
    if (fullText == null) return

    const words = fullText.split(" ")
    let wordIndex = 0
    setDisplayedText("")

    const intervalId = setInterval(() => {
      wordIndex += 1
      if (wordIndex >= words.length) {
        setDisplayedText(fullText)
        clearInterval(intervalId)
      } else {
        setDisplayedText(words.slice(0, wordIndex).join(" "))
      }
    }, TYPEWRITER_INTERVAL_MS)

    return () => clearInterval(intervalId)
  }, [aiDescription?.description])

  const fullText = aiDescription?.description ?? detail?.description
  const isTypewriting = aiDescription?.description != null && displayedText.length > 0 && displayedText !== aiDescription.description

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="book-detail-flip-in flex h-[90vh] sm:h-[70vh] w-[95vw] max-w-5xl flex-col gap-0 overflow-hidden overflow-y-auto p-0 sm:p-0">
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
          <div className="flex h-full flex-col overflow-y-auto sm:flex-row sm:overflow-hidden">
            {/* Left: cover image */}
            <div className="relative flex-shrink-0 overflow-hidden sm:w-80 sm:rounded-l-lg lg:w-96">
              <img
                src={detail.coverImageUrl ?? PLACEHOLDER_COVER}
                alt={`Cover of ${detail.title}`}
                onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_COVER }}
                className="h-48 w-full object-cover sm:h-full sm:max-h-[70vh]"
              />
            </div>

            {/* Right: details */}
            <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-8">
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
                {isDescriptionLoading && !isDescriptionError ? (
                  <p className="text-sm text-muted-foreground italic">✨ Generating AI description<span className="animate-pulse"> ▍</span></p>
                ) : isTypewriting ? (
                  <>
                    {displayedText}
                    <span className="animate-pulse">▍</span>
                  </>
                ) : (
                  fullText
                )}
              </div>

              {/* Action buttons */}
              <div className="mt-auto flex flex-col gap-3 pt-2">
                {!isAuthenticated && (
                  <p className="text-center text-sm text-muted-foreground">
                    <Link to="/login" className="font-medium text-primary hover:underline">{MESSAGES.checkout.loginToRead}</Link>
                  </p>
                )}
                {isAuthenticated && detail != null && !detail.canRent && (
                  <Button
                    size="lg"
                    className="w-full text-base"
                    disabled
                  >
                    <BookOpen className="mr-2 h-5 w-5" />
                    {MESSAGES.checkout.alreadyReading}
                  </Button>
                )}
                {isAuthenticated && detail != null && detail.canRent && (
                  <Button
                    size="lg"
                    className="w-full text-base"
                    disabled={isAlreadyInCart}
                    onClick={() => {
                      addToCart(book!)
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
                  <>
                    <Button
                      variant="destructive"
                      className="w-full"
                      disabled={isDeleting}
                      onClick={() => setIsDeleteDialogOpen(true)}
                    >
                      {isDeleting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      Delete Book
                    </Button>
                    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Book</AlertDialogTitle>
                          <AlertDialogDescription>
                            {MESSAGES.books.deleteConfirm}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={handleDelete}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
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
