import { apiClient } from "@/api/client"

export interface BookListDto {
  id: string
  title: string
  author: string
  genre: string | null
  availableCopies: number
  totalCopies: number
  coverImageUrl: string | null
}

export interface CreateBookRequest {
  title: string
  author: string
  isbn?: string
  publicationYear?: number
  genre?: string
  description?: string
  coverImageUrl?: string
  totalCopies: number
}

export interface PagedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
}

const ALL_BOOKS_PAGE_SIZE = 750

export function fetchBooks(): Promise<PagedResult<BookListDto>> {
  return apiClient.get<PagedResult<BookListDto>>(
    `/api/books?page=1&pageSize=${ALL_BOOKS_PAGE_SIZE}`
  )
}

export function createBook(data: CreateBookRequest): Promise<BookListDto> {
  return apiClient.post<BookListDto>("/api/books", data)
}
