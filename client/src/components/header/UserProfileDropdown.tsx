import { useEffect, useRef, useState } from "react"
import { User } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"

function UserProfileDropdown() {
  const { user, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function handleLogout() {
    setIsOpen(false)
    localStorage.setItem("lms_show_logout_toast", "true")
    logout()
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className="icon-btn"
        aria-label="User menu"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <User className="h-4 w-4" />
      </button>
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 z-50 w-64 rounded-md border bg-popover p-4 shadow-md">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">
                {user?.displayName}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {user?.role}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {user?.email}
            </span>
            <div className="my-1 border-t" />
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export { UserProfileDropdown }
