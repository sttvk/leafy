import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { fetchBooks } from "@/api/books"
import { useAuth } from "@/contexts/AuthContext"
import { BookGrid } from "@/components/BookGrid"
import { BookGridSkeleton } from "@/components/BookCardSkeleton"
import { AddBookModal } from "@/components/AddBookModal"
import { Button } from "@/components/ui/button"

function CatalogPage() {
  const { isLibrarian } = useAuth()
  const queryClient = useQueryClient()
  const [isAddBookOpen, setIsAddBookOpen] = useState(false)
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["books"],
    queryFn: fetchBooks,
  })

  const booksWithCovers = useMemo(() => {
    if (!data) return []
    return data.items.filter(
      (book) => book.coverImageUrl !== null && book.coverImageUrl !== ""
    )
  }, [data])

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
                {booksWithCovers.length} books
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

        {!isLoading && !isError && <BookGrid books={booksWithCovers} />}
      </main>

      {isLibrarian && (
        <AddBookModal
          open={isAddBookOpen}
          onOpenChange={setIsAddBookOpen}
          onBookAdded={() => queryClient.invalidateQueries({ queryKey: ["books"] })}
        />
      )}
    </div>
  )
}

export { CatalogPage }
