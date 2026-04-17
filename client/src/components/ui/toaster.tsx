import { Toaster as SonnerToaster } from "sonner"

function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      duration={3000}
      toastOptions={{
        className: "bg-popover text-popover-foreground border-border",
      }}
    />
  )
}

export { Toaster }
