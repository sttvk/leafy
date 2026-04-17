import { useEffect } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { BookOpen } from "lucide-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { MESSAGES } from "@/lib/messages"
import { verifyCheckoutSession } from "@/api/checkouts"
import { useCart } from "@/contexts/CartContext"
import { PageLayout } from "@/components/PageLayout"
import { Button } from "@/components/ui/button"

function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const { clearCart } = useCart()
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ["checkout-verify", sessionId],
    queryFn: () => verifyCheckoutSession(sessionId!),
    enabled: sessionId != null,
    staleTime: Infinity,
    retry: false,
  })

  useEffect(() => {
    if (data) {
      clearCart()
      queryClient.invalidateQueries({ queryKey: ["my-checkouts"] })
      queryClient.removeQueries({ queryKey: ["books"] })
      toast.success(MESSAGES.checkout.paymentSuccess)
    }
  }, [data])

  if (!sessionId) {
    return (
      <PageLayout>
        <div className="py-16 text-center">
          <h1 className="mb-2 text-xl font-semibold text-destructive">
            Verification Failed
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">Missing session ID.</p>
          <Button asChild variant="outline">
            <Link to="/">Back to Library</Link>
          </Button>
        </div>
      </PageLayout>
    )
  }

  if (isLoading) {
    return (
      <PageLayout>
        <div className="py-16 text-center">
          <p className="text-muted-foreground">Verifying your payment...</p>
        </div>
      </PageLayout>
    )
  }

  if (isError) {
    return (
      <PageLayout>
        <div className="py-16 text-center">
          <h1 className="mb-2 text-xl font-semibold text-destructive">
            Verification Failed
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Verification failed. Please contact support.
          </p>
          <Button asChild variant="outline">
            <Link to="/">Back to Library</Link>
          </Button>
        </div>
      </PageLayout>
    )
  }

  if (!data) {
    return null
  }

  return (
    <PageLayout>
      <div className="py-16">
        <div className="mx-auto max-w-md text-center">
          <h1 className="mb-2 text-xl font-semibold text-foreground">
            Payment Successful!
          </h1>
          <p className="mb-8 text-sm text-muted-foreground">
            You checked out {data.length} book{data.length !== 1 ? "s" : ""}.
          </p>
        </div>

        <ul className="mx-auto max-w-md divide-y divide-border rounded-lg border border-border">
          {data.map((checkout) => (
            <li key={checkout.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {checkout.bookTitle}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {checkout.bookAuthor}
                </p>
              </div>
              <Link
                to={`/read/${checkout.bookId}`}
                className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-accent"
              >
                <BookOpen className="h-3 w-3" />
                Read
              </Link>
            </li>
          ))}
        </ul>

        <div className="mx-auto mt-8 max-w-md text-center">
          <Button asChild variant="outline">
            <Link to="/">Back to Library</Link>
          </Button>
        </div>
      </div>
    </PageLayout>
  )
}

export { CheckoutSuccessPage }
