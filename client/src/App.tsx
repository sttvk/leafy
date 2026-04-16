import { useState, useEffect } from "react"
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query"
import { BrowserRouter, Routes, Route, Link } from "react-router-dom"
import { GoogleOAuthProvider } from "@react-oauth/google"
import { LogIn, Sun, Moon, Plus } from "lucide-react"
import { AuthProvider, useAuth } from "@/contexts/AuthContext"
import { CartProvider } from "@/contexts/CartContext"
import { CatalogPage } from "@/pages/CatalogPage"
import { AuthPage } from "@/pages/AuthPage"
import { ReaderPage } from "@/pages/ReaderPage"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { CartDropdown } from "@/components/CartDropdown"
import { UserProfileDropdown } from "@/components/UserProfileDropdown"
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
  const { isAuthenticated, isLibrarian, isLoading } = useAuth()
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
            {isLibrarian && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddBookOpen(true)}
                  aria-label="Add book"
                >
                  <Plus className="h-5 w-5" />
                </Button>
                <span className="text-border">|</span>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDark((prev) => !prev)}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            {isAuthenticated ? (
              <>
                <CartDropdown />
                <UserProfileDropdown />
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
        <Route
          path="/read/:bookId"
          element={
            <ProtectedRoute>
              <ReaderPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  )
}

function AppShell() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </CartProvider>
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
