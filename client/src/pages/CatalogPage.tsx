import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useMemo, useState } from "react"
import { Plus, X } from "lucide-react"
import { fetchBooks, type BookListDto } from "@/api/books"
import { checkoutBook } from "@/api/checkouts"
import { useAuth } from "@/contexts/AuthContext"
import { BookGrid } from "@/components/BookGrid"
import { BookGridSkeleton } from "@/components/BookCardSkeleton"
import { BookFormModal } from "@/components/BookFormModal"
import { BookDetailOverlay } from "@/components/BookDetailOverlay"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

function CatalogPage() {
  const { isAuthenticated, isLibrarian } = useAuth()
  const queryClient = useQueryClient()
  const [isAddBookOpen, setIsAddBookOpen] = useState(false)
  const [editingBook, setEditingBook] = useState<BookListDto | null>(null)
  const [selectedBook, setSelectedBook] = useState<BookListDto | null>(null)
  const [genreFilter, setGenreFilter] = useState<string>("all")
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all")
  const [authorSearch, setAuthorSearch] = useState("")

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["books"],
    queryFn: fetchBooks,
  })

  const allBooks = useMemo(() => {
    if (!data) return []
    return data.items.filter(
      (book) => book.coverImageUrl !== null && book.coverImageUrl !== ""
    )
  }, [data])

  const genres = useMemo(() => {
    const uniqueGenres = new Set(
      allBooks
        .map((book) => book.genre)
        .filter((genre): genre is string => genre !== null && genre !== "")
    )
    return Array.from(uniqueGenres).sort()
  }, [allBooks])

  const hasActiveFilters =
    genreFilter !== "all" ||
    availabilityFilter !== "all" ||
    authorSearch !== ""

  const filteredBooks = useMemo(() => {
    let result = allBooks

    if (genreFilter !== "all") {
      result = result.filter((book) => book.genre === genreFilter)
    }

    if (availabilityFilter === "available") {
      result = result.filter((book) => book.availableCopies > 0)
    } else if (availabilityFilter === "checked-out") {
      result = result.filter((book) => book.availableCopies === 0)
    }

    if (authorSearch !== "") {
      const search = authorSearch.toLowerCase()
      result = result.filter((book) =>
        book.author.toLowerCase().includes(search)
      )
    }

    return result
  }, [allBooks, genreFilter, availabilityFilter, authorSearch])

  function handleClearFilters(): void {
    setGenreFilter("all")
    setAvailabilityFilter("all")
    setAuthorSearch("")
  }

  const handleBorrowBook = useCallback(
    async (book: BookListDto) => {
      try {
        await checkoutBook(book.id)
        await queryClient.invalidateQueries({ queryKey: ["books"] })
        await queryClient.invalidateQueries({ queryKey: ["my-checkouts"] })
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to borrow book. Please try again."
        window.alert(message)
      }
    },
    [queryClient]
  )

  const bookCountText = hasActiveFilters
    ? `${filteredBooks.length} of ${allBooks.length} books`
    : `${allBooks.length} books`

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Library Catalog
            </h1>
            {!isLoading && !isError && (
              <p className="mt-1 text-sm text-muted-foreground">
                {bookCountText}
              </p>
            )}
          </div>
          {isLibrarian && (
            <Button onClick={() => setIsAddBookOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Book
            </Button>
          )}
        </div>

        {!isLoading && !isError && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Select value={genreFilter} onValueChange={setGenreFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Genres" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                {genres.map((genre) => (
                  <SelectItem key={genre} value={genre}>
                    {genre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={availabilityFilter}
              onValueChange={setAvailabilityFilter}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="checked-out">Checked Out</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Search by author..."
              value={authorSearch}
              onChange={(e) => setAuthorSearch(e.target.value)}
              className="w-[200px]"
            />

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                <X className="mr-1 h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
        )}
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {isLoading && <BookGridSkeleton />}

        {isError && (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <p className="text-lg font-medium text-foreground">
              Something went wrong
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              {error instanceof Error
                ? error.message
                : "Failed to load the catalog. Please try again."}
            </p>
            <Button onClick={() => refetch()}>Retry</Button>
          </div>
        )}

        {!isLoading && !isError && (
          <BookGrid
            books={filteredBooks}
            onEditBook={isLibrarian ? setEditingBook : undefined}
            onSelectBook={setSelectedBook}
          />
        )}
      </main>

      <BookDetailOverlay
        book={selectedBook}
        open={selectedBook != null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSelectedBook(null)
          }
        }}
        onBorrow={
          isAuthenticated && selectedBook
            ? () => handleBorrowBook(selectedBook)
            : undefined
        }
        onEdit={
          isLibrarian && selectedBook
            ? () => setEditingBook(selectedBook)
            : undefined
        }
      />

      {isLibrarian && (
        <>
          <BookFormModal
            open={isAddBookOpen}
            onOpenChange={setIsAddBookOpen}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ["books"] })}
          />
          <BookFormModal
            open={editingBook != null}
            onOpenChange={(nextOpen) => {
              if (!nextOpen) {
                setEditingBook(null)
              }
            }}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ["books"] })}
            book={editingBook}
          />
        </>
      )}
    </div>
  )
}

export { CatalogPage }
