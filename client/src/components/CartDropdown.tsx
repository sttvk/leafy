import { useCallback, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ShoppingCart } from "lucide-react"
import * as Popover from "@radix-ui/react-popover"
import { fetchMyCheckouts, returnBook, type CheckoutDto } from "@/api/checkouts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

function formatDueDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

type StatusVariant = "default" | "destructive"

function statusVariant(status: string): StatusVariant {
  return status === "Overdue" ? "destructive" : "default"
}

function CartDropdown() {
  const queryClient = useQueryClient()
  const [returningId, setReturningId] = useState<string | null>(null)

  const { data: checkouts } = useQuery({
    queryKey: ["my-checkouts"],
    queryFn: fetchMyCheckouts,
  })

  const activeCheckouts = (checkouts ?? []).filter(
    (c) => c.status === "Active" || c.status === "Overdue"
  )

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
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label="Open cart"
        >
          <ShoppingCart className="h-4 w-4" />
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
              My Cart ({activeCheckouts.length})
            </h3>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {activeCheckouts.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Your cart is empty
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {activeCheckouts.map((checkout) => (
                  <li key={checkout.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {checkout.bookTitle}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {checkout.bookAuthor}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          Due {formatDueDate(checkout.dueAt)}
                        </span>
                        <Badge variant={statusVariant(checkout.status)}>
                          {checkout.status}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={returningId === checkout.id}
                      onClick={() => handleReturn(checkout)}
                      className="shrink-0"
                    >
                      {returningId === checkout.id ? "..." : "Return"}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export { CartDropdown }
