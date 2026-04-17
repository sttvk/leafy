import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { BookOpen } from "lucide-react"
import * as Popover from "@radix-ui/react-popover"
import { toast } from "sonner"
import { MESSAGES, CONSTANTS } from "@/lib/messages"
import { fetchMyCheckouts, returnBook } from "@/api/checkouts"
import { useAuth } from "@/contexts/AuthContext"
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
import { daysRemaining } from "@/lib/dates"

function MyBooksDropdown() {
  const queryClient = useQueryClient()
  const { user, refreshUser } = useAuth()
  const [returningCheckoutId, setReturningCheckoutId] = useState<string | null>(null)
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

  const earlyReturns = user?.earlyReturns ?? 0

  const handleReturn = async (checkoutId: string) => {
    try {
      await returnBook(checkoutId)
      await queryClient.invalidateQueries({ queryKey: ["my-checkouts"] })
      await refreshUser()
      toast.success(MESSAGES.returns.success)
    } catch {
      toast.error(MESSAGES.returns.failed)
    }
  }

  return (
    <>
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
            <p className="mt-1 text-xs text-muted-foreground">
              {earlyReturns >= CONSTANTS.freeRentalThreshold
                ? "\uD83C\uDF89 You have a free rental!"
                : `\uD83C\uDF81 ${earlyReturns}/${CONSTANTS.freeRentalThreshold} early returns toward a free rental`}
            </p>
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
                  const days = daysRemaining(checkout.dueAt)

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
                        {days < 0 ? (
                          <p className="text-xs font-medium text-destructive">
                            Overdue
                          </p>
                        ) : days === 0 ? (
                          <p className="text-xs font-medium text-warning">
                            Due today
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            {days} {days === 1 ? "day" : "days"} left
                          </p>
                        )}
                      </div>
                      <Link
                        to={`/read/${checkout.bookId}`}
                        className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-accent"
                      >
                        <BookOpen className="h-3 w-3" />
                        Read
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 shrink-0 px-2 text-xs"
                        onClick={() => setReturningCheckoutId(checkout.id)}
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

      <AlertDialog
        open={returningCheckoutId !== null}
        onOpenChange={(open) => {
          if (!open) setReturningCheckoutId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Return Book</AlertDialogTitle>
            <AlertDialogDescription>
              {MESSAGES.returns.confirmReturn}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (returningCheckoutId !== null) {
                  handleReturn(returningCheckoutId)
                  setReturningCheckoutId(null)
                }
              }}
            >
              Return
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export { MyBooksDropdown }
