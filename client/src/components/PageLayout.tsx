import { cn } from "@/lib/utils"

interface PageLayoutProps {
  children: React.ReactNode
  className?: string
}

function PageLayout({ children, className }: PageLayoutProps) {
  return (
    <main className={cn("mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8", className)}>
      {children}
    </main>
  )
}

export { PageLayout }
