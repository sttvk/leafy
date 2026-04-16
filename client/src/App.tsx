import { Button } from "@/components/ui/button"

function App() {
  return (
    <div className="mx-auto max-w-5xl p-8 text-center">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Library Management System
      </h1>
      <p className="mt-4 text-muted-foreground">
        Welcome to the LMS catalog.
      </p>
      <div className="mt-6 flex items-center justify-center gap-4">
        <Button>Browse Catalog</Button>
        <Button variant="outline">Sign In</Button>
      </div>
    </div>
  )
}

export default App
