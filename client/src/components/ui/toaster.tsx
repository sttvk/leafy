import { Toaster as SonnerToaster } from "sonner"

function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        className: "bg-popover text-popover-foreground border-border",
      }}
    />
  )
}

export { Toaster }
