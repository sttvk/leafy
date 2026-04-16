import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useRef, useState } from "react"
import { X } from "lucide-react"
import { fetchBooks, type BookListDto, type PagedResult } from "@/api/books"
import { useAuth } from "@/contexts/AuthContext"
import { BookGrid } from "@/components/BookGrid"
import { BookGridSkeleton } from "@/components/BookCardSkeleton"
import { BookDetailOverlay } from "@/components/BookDetailOverlay"
import { BookFormModal } from "@/components/BookFormModal"
import { PageLayout } from "@/components/PageLayout"
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
  const { isLibrarian } = useAuth()
  const queryClient = useQueryClient()
  const [selectedBook, setSelectedBook] = useState<BookListDto | null>(null)
  const [editingBook, setEditingBook] = useState<BookListDto | null>(null)
  const [genreFilter, setGenreFilter] = useState<string>("all")
  const [authorSearch, setAuthorSearch] = useState("")

  const sentinelRef = useRef<HTMLDivElement>(null)

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["books"],
    queryFn: ({ pageParam }) => fetchBooks(pageParam),
    initialPageParam: 1,
    getNextPageParam: (
      lastPage: PagedResult<BookListDto>,
      allPages: readonly PagedResult<BookListDto>[]
    ) => {
      const totalFetched = allPages.reduce((sum, p) => sum + p.items.length, 0)
      return totalFetched < lastPage.totalCount ? allPages.length + 1 : undefined
    },
  })

  useEffect(() => {
    if (!sentinelRef.current || !hasNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const allBooks = useMemo(() => {
    if (!data) return []
    return data.pages.flatMap((page) =>
      page.items.filter(
        (book) => book.coverImageUrl !== null && book.coverImageUrl !== ""
      )
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
    authorSearch !== ""

  const filteredBooks = useMemo(() => {
    let result = allBooks

    if (genreFilter !== "all") {
      result = result.filter((book) => book.genre === genreFilter)
    }

    if (authorSearch !== "") {
      const search = authorSearch.toLowerCase()
      result = result.filter((book) =>
        book.author.toLowerCase().includes(search)
      )
    }

    return result
  }, [allBooks, genreFilter, authorSearch])

  function handleClearFilters(): void {
    setGenreFilter("all")
    setAuthorSearch("")
  }

  return (
    <div className="min-h-screen bg-background">
      <PageLayout>
        {!isLoading && !isError && (
          <div className="flex flex-nowrap items-center gap-3">
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

            <Input
              placeholder="Search by author..."
              value={authorSearch}
              onChange={(e) => setAuthorSearch(e.target.value)}
              className="flex-1 min-w-[200px]"
            />

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                <X className="mr-1 h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
        )}

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
          <div className="mt-2">
            <BookGrid
              books={filteredBooks}
              onSelectBook={setSelectedBook}
            />
            <div ref={sentinelRef} className="h-10" />
            {isFetchingNextPage && <BookGridSkeleton count={6} />}
          </div>
        )}
      </PageLayout>

      <BookDetailOverlay
        book={selectedBook}
        open={selectedBook != null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSelectedBook(null)
          }
        }}
        onEdit={
          isLibrarian && selectedBook
            ? () => {
                setEditingBook(selectedBook)
              }
            : undefined
        }
      />

      <BookFormModal
        open={editingBook != null}
        onOpenChange={(open) => {
          if (!open) setEditingBook(null)
        }}
        onSuccess={() =>
          queryClient.invalidateQueries({ queryKey: ["books"] })
        }
        book={editingBook}
      />
    </div>
  )
}

export { CatalogPage }
