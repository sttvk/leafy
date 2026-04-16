export interface BookListDto {
  id: string
  title: string
  author: string
  genre: string | null
  availableCopies: number
  totalCopies: number
  coverImageUrl: string | null
}

export interface PagedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
}

const ALL_BOOKS_PAGE_SIZE = 750

export async function fetchBooks(): Promise<PagedResult<BookListDto>> {
  const response = await fetch(`/api/books?page=1&pageSize=${ALL_BOOKS_PAGE_SIZE}`)

  if (!response.ok) {
    throw new Error(`Failed to fetch books: ${response.status} ${response.statusText}`)
  }

  const data: unknown = await response.json()
  return data as PagedResult<BookListDto>
}
