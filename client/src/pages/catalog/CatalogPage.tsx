import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useEffect, useRef, useState } from "react"
import { Loader2, Search, X } from "lucide-react"
import { fetchBooks, searchBooks, type BookListDto, type PagedResult, type SearchResponse } from "@/api/books"
import { useAuth } from "@/contexts/AuthContext"
import { BookGrid } from "@/pages/catalog/BookGrid"
import { BookGridSkeleton } from "@/pages/catalog/BookCardSkeleton"
import { BookDetailOverlay } from "@/pages/catalog/BookDetailOverlay"
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

const MIN_SEARCH_LENGTH = 2

function CatalogPage() {
  const { isLibrarian } = useAuth()
  const queryClient = useQueryClient()
  const [selectedBook, setSelectedBook] = useState<BookListDto | null>(null)
  const [editingBook, setEditingBook] = useState<BookListDto | null>(null)
  const [genreFilter, setGenreFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [activeSearch, setActiveSearch] = useState("")
  const [summaryDisplayText, setSummaryDisplayText] = useState("")
  const [isSummaryComplete, setIsSummaryComplete] = useState(false)

  const sentinelRef = useRef<HTMLDivElement>(null)

  const isSearchMode = activeSearch.length >= MIN_SEARCH_LENGTH

  function handleTriggerSearch(): void {
    setActiveSearch(searchQuery)
  }

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
    enabled: !isSearchMode,
  })

  const { data: searchData, isLoading: isSearching } = useQuery<SearchResponse>({
    queryKey: ["book-search", activeSearch],
    queryFn: () => searchBooks(activeSearch),
    enabled: isSearchMode,
  })

  useEffect(() => {
    if (!sentinelRef.current || !hasNextPage || isSearchMode) return

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
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, isSearchMode])

  const summaryRef = useRef(searchData?.summary ?? "")

  useEffect(() => {
    const summary = searchData?.summary ?? ""
    summaryRef.current = summary

    if (!summary) {
      setSummaryDisplayText("")
      setIsSummaryComplete(false)
      return
    }

    const words = summary.split(" ")
    let index = 0
    setSummaryDisplayText("")
    setIsSummaryComplete(false)

    const interval = setInterval(() => {
      index += 1
      if (index >= words.length) {
        setSummaryDisplayText(summaryRef.current)
        setIsSummaryComplete(true)
        clearInterval(interval)
      } else {
        setSummaryDisplayText(words.slice(0, index).join(" "))
      }
    }, 30)

    return () => clearInterval(interval)
  }, [searchData?.summary])

  useEffect(() => {
    setSummaryDisplayText("")
    setIsSummaryComplete(false)
  }, [activeSearch])

  const allBooks = useMemo(() => {
    if (!data) return []
    return data.pages.flatMap((page) => page.items)
  }, [data])

  const searchBooksAsListDto: readonly BookListDto[] = useMemo(() => {
    if (!searchData) return []
    return searchData.results.map(({ score: _score, ...book }) => book)
  }, [searchData])

  const genres = useMemo(() => {
    const source = isSearchMode ? searchBooksAsListDto : allBooks
    const uniqueGenres = new Set(
      source
        .map((book) => book.genre)
        .filter((genre): genre is string => genre !== null && genre !== "")
    )
    return Array.from(uniqueGenres).sort()
  }, [allBooks, searchBooksAsListDto, isSearchMode])

  const displayBooks = useMemo(() => {
    const source = isSearchMode ? searchBooksAsListDto : allBooks

    if (genreFilter === "all") return source

    return source.filter((book) => book.genre === genreFilter)
  }, [allBooks, searchBooksAsListDto, isSearchMode, genreFilter])

  const hasActiveFilters = genreFilter !== "all" || searchQuery !== ""

  const isPageLoading = isSearchMode ? isSearching : isLoading
  const isPageError = !isSearchMode && isError

  function handleClearFilters(): void {
    setGenreFilter("all")
    setSearchQuery("")
    setActiveSearch("")
  }

  return (
    <div className="min-h-screen bg-background">
      <PageLayout className="space-y-3">
        <div className="flex flex-nowrap items-center gap-3">
            <Select value={genreFilter} onValueChange={setGenreFilter}>
              <SelectTrigger className="w-[180px]" aria-label="Filter by genre">
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
              placeholder="Search with AI"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleTriggerSearch()
                }
              }}
              className="flex-1 min-w-[200px]"
            />

            <Button
              variant="outline"
              size="icon"
              onClick={handleTriggerSearch}
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </Button>

            {isSearchMode && isSearching && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                <X className="mr-1 h-3 w-3" />
                Clear
              </Button>
            )}
        </div>

        {isPageLoading && <BookGridSkeleton />}

        {isPageError && (
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

        {!isPageLoading && !isPageError && (
          <div>
            {isSearchMode && displayBooks.length === 0 && !isSearching && (
              <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
                <p className="text-lg font-medium text-foreground">
                  No books found
                </p>
                <p className="text-sm text-muted-foreground">
                  No results for &ldquo;{activeSearch}&rdquo;
                </p>
              </div>
            )}

            {isSearchMode && searchData?.summary != null && (
              <p className="mb-3 text-sm text-muted-foreground italic">
                {"✨ "}{summaryDisplayText}{!isSummaryComplete && <span className="animate-pulse">▍</span>}
              </p>
            )}

            {displayBooks.length > 0 && (
              <BookGrid
                books={displayBooks}
                onSelectBook={setSelectedBook}
              />
            )}

            {!isSearchMode && (
              <>
                <div ref={sentinelRef} className="h-10" />
                {isFetchingNextPage && <BookGridSkeleton count={6} />}
              </>
            )}
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
        onDelete={() => {
          queryClient.removeQueries({ queryKey: ["books"] })
          setSelectedBook(null)
        }}
      />

      <BookFormModal
        open={editingBook != null}
        onOpenChange={(open) => {
          if (!open) setEditingBook(null)
        }}
        onSuccess={() =>
          queryClient.removeQueries({ queryKey: ["books"] })
        }
        book={editingBook}
      />
    </div>
  )
}

export { CatalogPage }
