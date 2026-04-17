import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { BookOpen } from "lucide-react"
import { type CheckoutDto, verifyCheckoutSession } from "@/api/checkouts"
import { PageLayout } from "@/components/PageLayout"
import { Button } from "@/components/ui/button"

type VerifyState =
  | { status: "loading" }
  | { status: "success"; checkouts: CheckoutDto[] }
  | { status: "error"; message: string }

function CheckoutSuccessPage() {
  const [state, setState] = useState<VerifyState>({ status: "loading" })

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id")

    if (!sessionId) {
      setState({ status: "error", message: "Missing session ID." })
      return
    }

    let cancelled = false

    async function verify(id: string): Promise<void> {
      try {
        const checkouts = await verifyCheckoutSession(id)
        if (!cancelled) {
          setState({ status: "success", checkouts })
        }
      } catch {
        if (!cancelled) {
          setState({ status: "error", message: "Verification failed. Please contact support." })
        }
      }
    }

    void verify(sessionId)

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <PageLayout>
      {state.status === "loading" && (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">Verifying your payment...</p>
        </div>
      )}

      {state.status === "error" && (
        <div className="py-16 text-center">
          <h1 className="mb-2 text-xl font-semibold text-destructive">
            Verification Failed
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">{state.message}</p>
          <Button asChild variant="outline">
            <Link to="/">Back to Library</Link>
          </Button>
        </div>
      )}

      {state.status === "success" && (
        <div className="py-16">
          <div className="mx-auto max-w-md text-center">
            <h1 className="mb-2 text-xl font-semibold text-foreground">
              Payment Successful!
            </h1>
            <p className="mb-8 text-sm text-muted-foreground">
              You checked out {state.checkouts.length} book{state.checkouts.length !== 1 ? "s" : ""}.
            </p>
          </div>

          <ul className="mx-auto max-w-md divide-y divide-border rounded-lg border border-border">
            {state.checkouts.map((checkout) => (
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
      )}
    </PageLayout>
  )
}

export { CheckoutSuccessPage }
