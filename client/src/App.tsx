import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Routes, Route, Link } from "react-router-dom"
import { GoogleOAuthProvider } from "@react-oauth/google"
import { AuthProvider, useAuth } from "@/contexts/AuthContext"
import { CatalogPage } from "@/pages/CatalogPage"
import { AuthPage } from "@/pages/AuthPage"
import { CartDropdown } from "@/components/CartDropdown"
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
  const { isAuthenticated, isLoading, user, logout } = useAuth()

  return (
    <header className="bg-background">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="text-lg font-bold tracking-tight text-foreground"
        >
          Library
        </Link>

        {!isLoading && (
          <nav className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <CartDropdown />
                <span className="text-sm text-muted-foreground">
                  {user?.displayName}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {user?.role}
                </span>
                <Button variant="ghost" size="sm" onClick={logout}>
                  Logout
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Login</Link>
              </Button>
            )}
          </nav>
        )}
      </div>
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
