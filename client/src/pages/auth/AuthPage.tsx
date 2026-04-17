import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { GoogleLogin } from "@react-oauth/google"
import type { CredentialResponse } from "@react-oauth/google"
import { toast } from "sonner"
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
import {
  validateEmail,
  validateFullName,
  validatePassword,
  validateRequired,
} from "@/lib/validation"

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
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  function markTouched(field: string): void {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }))
  }

  function markAllTouched(fields: readonly string[]): void {
    setTouched((prev) => {
      const next: Record<string, boolean> = { ...prev }
      for (const f of fields) {
        next[f] = true
      }
      return next
    })
  }

  const loginErrors = {
    email: touched.email ? validateEmail(email) : null,
    password: touched.password ? validateRequired(password, "Password") : null,
  }

  const registerErrors = {
    fullName: touched.fullName ? validateFullName(fullName) : null,
    email: touched.email ? validateEmail(email) : null,
    password: touched.password ? validatePassword(password) : null,
  }

  function hasErrors(errors: Record<string, string | null>): boolean {
    return Object.values(errors).some((e) => e !== null)
  }

  function handleTabSwitch(tab: AuthTab): void {
    setActiveTab(tab)
    setEmail("")
    setPassword("")
    setFullName("")
    setError(null)
    setTouched({})
  }

  async function handleLoginSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    setError(null)

    const fields = ["email", "password"] as const
    markAllTouched(fields)

    const errors = {
      email: validateEmail(email),
      password: validateRequired(password, "Password"),
    }
    if (hasErrors(errors)) return

    setIsSubmitting(true)

    try {
      await login(email, password)
      navigate("/", { replace: true })
      toast.success("Logged in successfully")
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Login failed. Please try again."
      setError(message)
      toast.error("Login failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRegisterSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    setError(null)

    const fields = ["fullName", "email", "password"] as const
    markAllTouched(fields)

    const errors = {
      fullName: validateFullName(fullName),
      email: validateEmail(email),
      password: validatePassword(password),
    }
    if (hasErrors(errors)) return

    setIsSubmitting(true)

    try {
      await register(email, password, fullName)
      navigate("/", { replace: true })
      toast.success("Account created successfully")
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again."
      setError(message)
      toast.error("Registration failed")
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
      toast.error("Google login failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLoginTab = activeTab === "login"

  return (
    <PageLayout className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <Card className="w-full max-w-md p-2">
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
                  onChange={(e) => {
                    setEmail(e.target.value)
                    markTouched("email")
                  }}
                  autoComplete="email"
                  error={loginErrors.email ?? undefined}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    markTouched("password")
                  }}
                  autoComplete="current-password"
                  error={loginErrors.password ?? undefined}
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
                  onChange={(e) => {
                    setFullName(e.target.value)
                    markTouched("fullName")
                  }}
                  autoComplete="name"
                  error={registerErrors.fullName ?? undefined}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="register-email">Email</Label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    markTouched("email")
                  }}
                  autoComplete="email"
                  error={registerErrors.email ?? undefined}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="register-password">Password</Label>
                <Input
                  id="register-password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    markTouched("password")
                  }}
                  autoComplete="new-password"
                  error={registerErrors.password ?? undefined}
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

              <div className="relative w-full h-10">
                <Button variant="outline" className="absolute inset-0 w-full pointer-events-none">
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Continue with Google
                </Button>
                <div className="absolute inset-0 cursor-pointer opacity-0">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError("Google sign-in failed. Please try again.")}
                    size="large"
                    width="400"
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
        </Card>
    </PageLayout>
  )
}

export { AuthPage }
