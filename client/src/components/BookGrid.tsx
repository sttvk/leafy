import type { BookListDto } from "@/api/books"
import { BookCard } from "@/components/BookCard"

interface BookGridProps {
  books: readonly BookListDto[]
  onSelectBook?: (book: BookListDto) => void
}

function BookGrid({ books, onSelectBook }: BookGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:gap-6">
      {books.map((book) => (
        <BookCard
          key={book.id}
          book={book}
          onSelect={onSelectBook ? () => onSelectBook(book) : undefined}
        />
      ))}
    </div>
  )
}

export { BookGrid }
