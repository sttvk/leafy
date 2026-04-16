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

type AuthTab = "login" | "register"

function AuthPage() {
  const navigate = useNavigate()
  const { login, register, googleLogin } = useAuth()

  const [activeTab, setActiveTab] = useState<AuthTab>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleTabSwitch(tab: AuthTab): void {
    setActiveTab(tab)
    setEmail("")
    setPassword("")
    setFullName("")
    setError(null)
  }

  async function handleLoginSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await login(email, password)
      navigate("/", { replace: true })
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Login failed. Please try again."
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRegisterSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await register(email, password, fullName)
      navigate("/", { replace: true })
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again."
      setError(message)
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

  const isLoginTab = activeTab === "login"

  return (
    <PageLayout className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {isLoginTab ? "Login" : "Create Account"}
          </CardTitle>
          <CardDescription>
            {isLoginTab
              ? "Enter your credentials to continue"
              : "Fill in the details to create your account"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="mb-6 flex border-b border-border">
            <button
              type="button"
              className={`flex-1 pb-2 text-sm font-medium transition-colors ${
                isLoginTab
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => handleTabSwitch("login")}
            >
              Login
            </button>
            <button
              type="button"
              className={`flex-1 pb-2 text-sm font-medium transition-colors ${
                !isLoginTab
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => handleTabSwitch("register")}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {isLoginTab ? (
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Please wait..." : "Login"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="register-name">Full Name</Label>
                <Input
                  id="register-name"
                  type="text"
                  placeholder="Jane Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="register-email">Email</Label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="register-password">Password</Label>
                <Input
                  id="register-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Please wait..." : "Create Account"}
              </Button>
            </form>
          )}

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
