import { Pencil } from "lucide-react"
import type { BookListDto } from "@/api/books"
import { useAuth } from "@/contexts/AuthContext"

interface BookCardProps {
  book: BookListDto
  onEdit?: () => void
  onSelect?: () => void
}

const PLACEHOLDER_COVER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300' fill='%23e5e7eb'%3E%3Crect width='200' height='300'/%3E%3C/svg%3E"

function BookCard({ book, onEdit, onSelect }: BookCardProps) {
  const { isLibrarian } = useAuth()

  return (
    <div
      className="group relative cursor-pointer overflow-hidden rounded-lg shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
      style={{ aspectRatio: "2/3" }}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect?.()
        }
      }}
      aria-label={`View details for ${book.title}`}
    >
      <img
        src={book.coverImageUrl ?? PLACEHOLDER_COVER}
        alt={`Cover of ${book.title}`}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
      />

      {/* Genre badge — top left */}
      {book.genre && (
        <span className="absolute left-2 top-2 z-10 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
          {book.genre}
        </span>
      )}

      {/* Bottom gradient overlay with title and author */}
      <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-3 pt-10">
        <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-white">
          {book.title}
        </h3>
        <p className="mt-0.5 line-clamp-1 text-xs text-white/70">
          {book.author}
        </p>
      </div>

      {/* Librarian edit overlay on hover */}
      {isLibrarian && onEdit && (
        <div
          className="absolute inset-0 z-20 flex cursor-pointer items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation()
            onEdit()
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation()
              e.preventDefault()
              onEdit()
            }
          }}
          aria-label={`Edit ${book.title}`}
        >
          <Pencil className="h-8 w-8 text-white" />
        </div>
      )}

    </div>
  )
}

export { BookCard }
