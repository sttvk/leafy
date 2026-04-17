import { useEffect } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { GoogleOAuthProvider } from "@react-oauth/google"
import { toast } from "sonner"
import { AuthProvider } from "@/contexts/AuthContext"
import { CartProvider } from "@/contexts/CartContext"
import { CatalogPage } from "@/pages/catalog/CatalogPage"
import { AuthPage } from "@/pages/auth/AuthPage"
import { ReaderPage } from "@/pages/reader/ReaderPage"
import { CheckoutSuccessPage } from "@/pages/checkout/CheckoutSuccessPage"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { Toaster } from "@/components/ui/toaster"


const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
})

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<CatalogPage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route
        path="/checkout/success"
        element={
          <ProtectedRoute>
            <CheckoutSuccessPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/read/:bookId"
        element={
          <ProtectedRoute>
            <ReaderPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

function AppShell() {
  useEffect(() => {
    if (localStorage.getItem("lms_show_logout_toast") === "true") {
      toast.success("Logged out successfully")
      localStorage.removeItem("lms_show_logout_toast")
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
          <Toaster />
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
