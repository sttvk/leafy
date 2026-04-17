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

export function returnBook(checkoutId: string): Promise<CheckoutDto> {
  return apiClient.post<CheckoutDto>(`/api/checkouts/${checkoutId}/return`)
}

export function fetchMyCheckouts(): Promise<CheckoutDto[]> {
  return apiClient.get<CheckoutDto[]>("/api/checkouts/mine")
}

interface CreateSessionResponse {
  sessionUrl: string
}

export function createCheckoutSession(
  bookIds: string[],
  successUrl: string,
  cancelUrl: string
): Promise<CreateSessionResponse> {
  return apiClient.post<CreateSessionResponse>("/api/checkout/create-session", {
    bookIds,
    successUrl,
    cancelUrl,
  })
}

export function verifyCheckoutSession(sessionId: string): Promise<CheckoutDto[]> {
  return apiClient.post<CheckoutDto[]>("/api/checkout/verify-session", {
    sessionId,
  })
}
