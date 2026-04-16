import { User } from "lucide-react"
import * as Popover from "@radix-ui/react-popover"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"

function UserProfileDropdown() {
  const { user, logout } = useAuth()

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button variant="ghost" size="sm" aria-label="User menu">
          <User className="h-5 w-5" />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          align="end"
          className="z-50 w-64 rounded-md border bg-popover p-4 shadow-md"
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
            <div className="my-1 border-t" />
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
  )
}

export { UserProfileDropdown }
