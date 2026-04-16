import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { CatalogPage } from "@/pages/CatalogPage"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CatalogPage />
    </QueryClientProvider>
  )
}

export default App
