import { useState, useEffect } from "react"
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query"
import { BrowserRouter, Routes, Route, Link } from "react-router-dom"
import { GoogleOAuthProvider } from "@react-oauth/google"
import { LogIn, Sun, Moon, Plus, User as UserIcon } from "lucide-react"
import * as Popover from "@radix-ui/react-popover"
import { AuthProvider, useAuth } from "@/contexts/AuthContext"
import { CatalogPage } from "@/pages/CatalogPage"
import { AuthPage } from "@/pages/AuthPage"
import { CartDropdown } from "@/components/CartDropdown"
import { BookFormModal } from "@/components/BookFormModal"
import { Button } from "@/components/ui/button"

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
})

function NavHeader() {
  const { isAuthenticated, isLibrarian, isLoading, user, logout } = useAuth()
  const queryClient = useQueryClient()
  const [isAddBookOpen, setIsAddBookOpen] = useState(false)
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("lms_theme") === "dark"
  })

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("lms_theme", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("lms_theme", "light")
    }
  }, [isDark])

  return (
    <header className="sticky top-0 z-40 bg-background">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="text-lg font-bold tracking-tight text-foreground"
        >
          Library
        </Link>

        {!isLoading && (
          <nav className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDark((prev) => !prev)}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            {isLibrarian && (
              <>
                <span className="text-border">|</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddBookOpen(true)}
                  aria-label="Add book"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </>
            )}
            {isAuthenticated ? (
              <>
                <CartDropdown />
                <Popover.Root>
                  <Popover.Trigger asChild>
                    <Button variant="ghost" size="sm" aria-label="User menu">
                      <UserIcon className="h-5 w-5" />
                    </Button>
                  </Popover.Trigger>
                  <Popover.Portal>
                    <Popover.Content
                      sideOffset={8}
                      align="end"
                      className="z-50 rounded-md border bg-popover p-4 w-64 shadow-md"
                    >
                      <div className="flex flex-col gap-2">
                        <span className="text-sm font-bold text-foreground">
                          {user?.displayName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {user?.email}
                        </span>
                        <span className="w-fit rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          {user?.role}
                        </span>
                        <div className="border-t my-1" />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full"
                          onClick={logout}
                        >
                          Logout
                        </Button>
                      </div>
                    </Popover.Content>
                  </Popover.Portal>
                </Popover.Root>
              </>
            ) : (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login" aria-label="Login">
                  <LogIn className="h-5 w-5" />
                </Link>
              </Button>
            )}
          </nav>
        )}
      </div>
      <BookFormModal
        open={isAddBookOpen}
        onOpenChange={setIsAddBookOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["books"] })}
      />
    </header>
  )
}

function AppRoutes() {
  return (
    <>
      <NavHeader />
      <Routes>
        <Route path="/" element={<CatalogPage />} />
        <Route path="/login" element={<AuthPage />} />
      </Routes>
    </>
  )
}

function AppShell() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

function App() {
  if (GOOGLE_CLIENT_ID) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <AppShell />
      </GoogleOAuthProvider>
    )
  }

  return <AppShell />
}

export default App
