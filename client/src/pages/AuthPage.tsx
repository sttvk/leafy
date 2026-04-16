import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { GoogleLogin } from "@react-oauth/google"
import type { CredentialResponse } from "@react-oauth/google"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PageLayout } from "@/components/PageLayout"

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

const LOGIN_FAILURE_PATTERN = /invalid email or password/i

function AuthPage() {
  const navigate = useNavigate()
  const { login, register, googleLogin } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await login(email, password)
      navigate("/", { replace: true })
    } catch (loginError: unknown) {
      const loginMessage =
        loginError instanceof Error ? loginError.message : ""

      if (!LOGIN_FAILURE_PATTERN.test(loginMessage)) {
        setError(loginMessage || "Login failed. Please try again.")
        setIsSubmitting(false)
        return
      }

      try {
        await register(email, password, email.split("@")[0])
        navigate("/", { replace: true })
      } catch (registerError: unknown) {
        const registerMessage =
          registerError instanceof Error
            ? registerError.message
            : "Registration failed. Please try again."
        setError(registerMessage)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleGoogleSuccess(
    response: CredentialResponse
  ): Promise<void> {
    if (!response.credential) {
      setError("Google sign-in failed: no credential received.")
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      await googleLogin(response.credential)
      navigate("/", { replace: true })
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Google sign-in failed. Please try again."
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PageLayout className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>Enter your credentials to continue</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Please wait..." : "Continue"}
            </Button>
          </form>

          {GOOGLE_CLIENT_ID && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    or continue with
                  </span>
                </div>
              </div>

              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() =>
                    setError("Google sign-in failed. Please try again.")
                  }
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  )
}

export { AuthPage }
