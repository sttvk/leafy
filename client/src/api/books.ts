import { apiClient } from "@/api/client"

export interface BookListDto {
  id: string
  title: string
  author: string
  genre: string | null
  coverImageUrl: string | null
}

export interface BookDetailDto {
  id: string
  title: string
  author: string
  isbn: string | null
  publicationYear: number | null
  genre: string | null
  description: string | null
  coverImageUrl: string | null
  addedAt: string
}

export interface CreateBookRequest {
  title: string
  author: string
  isbn?: string
  publicationYear?: number
  genre?: string
  description?: string
  coverImageUrl?: string
}

export type UpdateBookRequest = CreateBookRequest

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

export function fetchBook(id: string): Promise<BookDetailDto> {
  return apiClient.get<BookDetailDto>(`/api/books/${id}`)
}

export function createBook(data: CreateBookRequest): Promise<BookDetailDto> {
  return apiClient.post<BookDetailDto>("/api/books", data)
}

export function updateBook(id: string, data: UpdateBookRequest): Promise<BookDetailDto> {
  return apiClient.put<BookDetailDto>(`/api/books/${id}`, data)
}
