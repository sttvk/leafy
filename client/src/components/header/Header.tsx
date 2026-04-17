import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { LogIn, Sun, Moon, Plus } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { CartDropdown } from "@/components/header/CartDropdown"
import { MyBooksDropdown } from "@/components/header/MyBooksDropdown"
import { UserProfileDropdown } from "@/components/header/UserProfileDropdown"
import { BookFormModal } from "@/components/BookFormModal"

function Header() {
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
          className="text-2xl font-bold tracking-tight text-foreground"
          style={{ fontFamily: "Playfair Display, serif" }}
        >
          Leafy
        </Link>

        {!isLoading && (
          <nav className="flex items-center gap-2">
            {isLibrarian && (
              <>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setIsAddBookOpen(true)}
                  aria-label="Add book"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <span className="text-border">|</span>
              </>
            )}
            <button
              type="button"
              className="icon-btn"
              onClick={() => setIsDark((prev) => !prev)}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun fill="currentColor" className="h-4 w-4 text-amber-500" /> : <Moon fill="currentColor" className="h-4 w-4 text-[#dbd0ba]" />}
            </button>
            {isAuthenticated ? (
              <>
                <CartDropdown />
                <MyBooksDropdown />
                <UserProfileDropdown />
              </>
            ) : (
              <Link to="/login" aria-label="Login" className="icon-btn gap-1.5">
                <LogIn className="h-4 w-4" />
                <span className="text-sm">Login</span>
              </Link>
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

export { Header }
