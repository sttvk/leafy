import { useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { BookOpen } from "lucide-react"
import * as Popover from "@radix-ui/react-popover"
import { fetchMyCheckouts, returnBook } from "@/api/checkouts"
import { Button } from "@/components/ui/button"

const MS_PER_DAY = 1000 * 60 * 60 * 24

function computeDaysRemaining(dueAt: string): number {
  return Math.ceil((new Date(dueAt).getTime() - Date.now()) / MS_PER_DAY)
}

function MyBooksDropdown() {
  const queryClient = useQueryClient()
  const { data: myCheckouts } = useQuery({
    queryKey: ["my-checkouts"],
    queryFn: fetchMyCheckouts,
  })

  const activeCheckouts = useMemo(
    () =>
      (myCheckouts ?? []).filter(
        (c) => c.status === "Active" || c.status === "Overdue"
      ),
    [myCheckouts]
  )

  const handleReturn = async (checkoutId: string) => {
    try {
      await returnBook(checkoutId)
      await queryClient.invalidateQueries({ queryKey: ["my-checkouts"] })
    } catch {
      window.alert("Failed to return book. Please try again.")
    }
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="icon-btn relative"
          aria-label="Open my books"
        >
          <BookOpen className="h-4 w-4" />
          {activeCheckouts.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {activeCheckouts.length}
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-80 rounded-lg border border-border bg-popover p-0 shadow-md"
        >
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">
              My Books ({activeCheckouts.length})
            </h3>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {activeCheckouts.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No books rented
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {activeCheckouts.map((checkout) => {
                  const daysRemaining = computeDaysRemaining(checkout.dueAt)
                  const isOverdue = daysRemaining <= 0

                  return (
                    <li
                      key={checkout.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {checkout.bookTitle}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {checkout.bookAuthor}
                        </p>
                        {isOverdue ? (
                          <p className="text-xs font-medium text-destructive">
                            Overdue
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            {daysRemaining} {daysRemaining === 1 ? "day" : "days"} left
                          </p>
                        )}
                      </div>
                      <a
                        href={`/read/${checkout.bookId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-accent"
                      >
                        <BookOpen className="h-3 w-3" />
                        Read
                      </a>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 shrink-0 px-2 text-xs"
                        onClick={() => handleReturn(checkout.id)}
                      >
                        Return
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export { MyBooksDropdown }
