import { Pencil, Trash2 } from "lucide-react"
import type { BookListDto } from "@/api/books"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface BookCardProps {
  book: BookListDto
}

const PLACEHOLDER_COVER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300' fill='%23e5e7eb'%3E%3Crect width='200' height='300'/%3E%3C/svg%3E"

function BookCard({ book }: BookCardProps) {
  const { isLibrarian } = useAuth()
  const isAvailable = book.availableCopies > 0

  return (
    <div className="group overflow-hidden rounded-lg bg-card shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
      <div className="relative aspect-[2/3] overflow-hidden">
        <img
          src={book.coverImageUrl ?? PLACEHOLDER_COVER}
          alt={`Cover of ${book.title}`}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-col gap-1.5 p-3">
        <div className="flex items-start justify-between gap-1">
          <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-foreground">
            {book.title}
          </h3>
          {isLibrarian && (
            <div className="flex shrink-0 items-center gap-0.5">
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
        <p className="line-clamp-1 text-xs text-muted-foreground">
          {book.author}
        </p>
        <div className="mt-1 flex items-center justify-between">
          {book.genre ? (
            <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {book.genre}
            </span>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span
              className={cn(
                "inline-block h-2 w-2 rounded-full",
                isAvailable ? "bg-green-500" : "bg-red-500"
              )}
            />
            <span>
              {book.availableCopies} of {book.totalCopies}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export { BookCard }
