import { useCallback, useMemo, useState } from "react"
import { ShoppingCart, X } from "lucide-react"
import * as Popover from "@radix-ui/react-popover"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { CONSTANTS, MESSAGES } from "@/lib/messages"
import { createCheckoutSession } from "@/api/checkouts"
import { useCart } from "@/contexts/CartContext"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"

function CartDropdown() {
  const { items, removeFromCart, clearCart, itemCount } = useCart()
  const { user } = useAuth()
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const queryClient = useQueryClient()

  const hasFreeCredit = (user?.earlyReturns ?? 0) >= CONSTANTS.freeRentalThreshold

  const checkoutLabel = useMemo(() => {
    if (itemCount === 0) return "Checkout"
    if (hasFreeCredit && itemCount === 1) return "Checkout \u00b7 Free!"
    if (hasFreeCredit && itemCount > 1) {
      const paidTotal = ((itemCount - 1) * CONSTANTS.rentalPricePerBook).toFixed(2)
      return `Checkout \u00b7 $${paidTotal} (1 book free!)`
    }
    return `Checkout \u00b7 $${(itemCount * CONSTANTS.rentalPricePerBook).toFixed(2)}`
  }, [itemCount, hasFreeCredit])

  const handleCheckout = useCallback(async () => {
    if (items.length === 0) return

    setIsCheckingOut(true)
    try {
      const bookIds = items.map((item) => item.id)
      const successUrl = `${window.location.origin}/checkout/success`
      const cancelUrl = window.location.origin
      const response = await createCheckoutSession(bookIds, successUrl, cancelUrl)
      clearCart()

      if (response.isFree) {
        toast.success("Free rental applied!")
        queryClient.invalidateQueries({ queryKey: ["my-checkouts"] })
        queryClient.invalidateQueries({ queryKey: ["books"] })
        setIsCheckingOut(false)
        return
      }

      if (response.sessionUrl) {
        window.location.href = response.sessionUrl
      }
    } catch {
      toast.error(MESSAGES.checkout.checkoutFailed)
      setIsCheckingOut(false)
    }
  }, [items, clearCart, queryClient])

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="icon-btn relative"
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
                {isCheckingOut ? "Processing..." : checkoutLabel}
              </Button>
            </div>
          )}

        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export { CartDropdown }
