import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useState } from "react"
import { fetchMyCheckouts, returnBook, type CheckoutDto } from "@/api/checkouts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

type StatusVariant = "default" | "destructive" | "success"

function statusVariant(status: string): StatusVariant {
  switch (status) {
    case "Overdue":
      return "destructive"
    case "Returned":
      return "success"
    default:
      return "default"
  }
}

function MyLoansPage() {
  const queryClient = useQueryClient()
  const [returningId, setReturningId] = useState<string | null>(null)

  const { data: checkouts, isLoading, isError, error } = useQuery({
    queryKey: ["my-checkouts"],
    queryFn: fetchMyCheckouts,
  })

  const handleReturn = useCallback(
    async (checkout: CheckoutDto) => {
      setReturningId(checkout.id)
      try {
        await returnBook(checkout.id)
        await queryClient.invalidateQueries({ queryKey: ["my-checkouts"] })
        await queryClient.invalidateQueries({ queryKey: ["books"] })
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to return book. Please try again."
        window.alert(message)
      } finally {
        setReturningId(null)
      }
    },
    [queryClient]
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          My Loans
        </h1>

        <main className="mt-8">
          {isLoading && (
            <div className="flex items-center justify-center py-24">
              <p className="text-sm text-muted-foreground">
                Loading your loans...
              </p>
            </div>
          )}

          {isError && (
            <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
              <p className="text-lg font-medium text-foreground">
                Something went wrong
              </p>
              <p className="max-w-md text-sm text-muted-foreground">
                {error instanceof Error
                  ? error.message
                  : "Failed to load your loans. Please try again."}
              </p>
            </div>
          )}

          {!isLoading && !isError && checkouts?.length === 0 && (
            <div className="flex items-center justify-center py-24">
              <p className="text-sm text-muted-foreground">
                You haven't borrowed any books yet.
              </p>
            </div>
          )}

          {!isLoading && !isError && checkouts && checkouts.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-muted-foreground">
                      Book
                    </th>
                    <th className="hidden px-4 py-3 font-medium text-muted-foreground sm:table-cell">
                      Checked Out
                    </th>
                    <th className="hidden px-4 py-3 font-medium text-muted-foreground sm:table-cell">
                      Due
                    </th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {checkouts.map((checkout) => (
                    <tr key={checkout.id}>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-foreground">
                            {checkout.bookTitle}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {checkout.bookAuthor}
                          </p>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                        {formatDate(checkout.checkedOutAt)}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                        {formatDate(checkout.dueAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(checkout.status)}>
                          {checkout.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {checkout.status === "Active" ||
                        checkout.status === "Overdue" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={returningId === checkout.id}
                            onClick={() => handleReturn(checkout)}
                          >
                            {returningId === checkout.id
                              ? "Returning..."
                              : "Return"}
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export { MyLoansPage }
