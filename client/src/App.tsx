import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { GoogleOAuthProvider } from "@react-oauth/google"
import { AuthProvider } from "@/contexts/AuthContext"
import { CartProvider } from "@/contexts/CartContext"
import { CatalogPage } from "@/pages/catalog/CatalogPage"
import { AuthPage } from "@/pages/auth/AuthPage"
import { ReaderPage } from "@/pages/reader/ReaderPage"
import { CheckoutSuccessPage } from "@/pages/checkout/CheckoutSuccessPage"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { Header } from "@/components/header/Header"
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
    <>
      <Header />
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  )
}

function AppShell() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <AppRoutes />
            <Toaster />
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
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
