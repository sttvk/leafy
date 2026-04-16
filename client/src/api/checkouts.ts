import { apiClient } from "@/api/client"

export interface CheckoutDto {
  id: string
  bookId: string
  bookTitle: string
  bookAuthor: string
  checkedOutAt: string
  dueAt: string
  returnedAt: string | null
  status: string
}

export function checkoutBook(bookId: string): Promise<CheckoutDto> {
  return apiClient.post<CheckoutDto>(`/api/books/${bookId}/checkout`)
}

export function returnBook(checkoutId: string): Promise<CheckoutDto> {
  return apiClient.post<CheckoutDto>(`/api/checkouts/${checkoutId}/return`)
}

export function fetchMyCheckouts(): Promise<CheckoutDto[]> {
  return apiClient.get<CheckoutDto[]>("/api/checkouts/mine")
}
