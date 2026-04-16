import { useCallback, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { ShoppingCart, X, BookOpen } from "lucide-react"
import * as Popover from "@radix-ui/react-popover"
import type { BookListDto } from "@/api/books"
import { checkoutBook } from "@/api/checkouts"
import { useCart } from "@/contexts/CartContext"
import { Button } from "@/components/ui/button"

function CartDropdown() {
  const queryClient = useQueryClient()
  const { items, removeFromCart, clearCart, itemCount } = useCart()
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [checkedOutBooks, setCheckedOutBooks] = useState<BookListDto[]>([])

  const handleCheckout = useCallback(async () => {
    if (items.length === 0) return

    setIsCheckingOut(true)
    const failedIds: string[] = []

    for (const item of items) {
      try {
        await checkoutBook(item.id)
      } catch {
        failedIds.push(item.id)
      }
    }

    const succeededItems = items.filter((item) => !failedIds.includes(item.id))

    await queryClient.invalidateQueries({ queryKey: ["books"] })

    if (failedIds.length > 0 && failedIds.length < items.length) {
      for (const item of succeededItems) {
        removeFromCart(item.id)
      }
      setCheckedOutBooks(succeededItems)
      window.alert(
        `${succeededItems.length} book(s) checked out. ${failedIds.length} failed — they may be unavailable.`
      )
    } else if (failedIds.length === items.length) {
      window.alert("Checkout failed for all items. Please try again.")
    } else {
      setCheckedOutBooks([...items])
      clearCart()
    }

    setIsCheckingOut(false)
  }, [items, removeFromCart, clearCart, queryClient])

  const handleDone = useCallback(() => {
    setCheckedOutBooks([])
  }, [])

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label="Open cart"
        >
          <ShoppingCart className="h-4 w-4" />
          {itemCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {itemCount}
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
          {checkedOutBooks.length > 0 ? (
            <>
              <div className="border-b border-border px-4 py-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Checked Out ({checkedOutBooks.length})
                </h3>
              </div>

              <div className="max-h-72 overflow-y-auto">
                <ul className="divide-y divide-border">
                  {checkedOutBooks.map((book) => (
                    <li key={book.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {book.title}
                        </p>
                      </div>
                      <a
                        href={`/read/${book.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-accent"
                      >
                        <BookOpen className="h-3 w-3" />
                        Read
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t border-border px-4 py-3">
                <Button size="sm" variant="secondary" className="w-full" onClick={handleDone}>
                  Done
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="border-b border-border px-4 py-3">
                <h3 className="text-sm font-semibold text-foreground">
                  My Cart ({itemCount})
                </h3>
              </div>

              <div className="max-h-72 overflow-y-auto">
                {itemCount === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      Your cart is empty
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {items.map((item) => (
                      <li key={item.id} className="flex items-start gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {item.title}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {item.author}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                          aria-label={`Remove ${item.title} from cart`}
                          onClick={() => removeFromCart(item.id)}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {itemCount > 0 && (
                <div className="border-t border-border px-4 py-3">
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={isCheckingOut}
                    onClick={handleCheckout}
                  >
                    {isCheckingOut ? "Processing..." : `Checkout (${itemCount})`}
                  </Button>
                </div>
              )}
            </>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export { CartDropdown }
