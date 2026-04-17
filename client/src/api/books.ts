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

export const PAGE_SIZE = 25

export function fetchBooks(page: number = 1, pageSize: number = PAGE_SIZE): Promise<PagedResult<BookListDto>> {
  return apiClient.get<PagedResult<BookListDto>>(
    `/api/books?page=${page}&pageSize=${pageSize}`
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

export function deleteBook(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/books/${id}`)
}

export interface BookSearchResult {
  id: string
  title: string
  author: string
  genre: string | null
  coverImageUrl: string | null
  score: number
}

export function searchBooks(query: string, limit: number = 25): Promise<BookSearchResult[]> {
  return apiClient.get<BookSearchResult[]>(
    `/api/books/search?q=${encodeURIComponent(query)}&limit=${limit}`
  )
}
