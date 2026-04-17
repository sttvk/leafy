export interface AuthUser {
  id: string
  email: string
  displayName: string
  role: "Librarian" | "Member"
  earlyReturns: number
}

export interface AuthResponse {
  token: string
  email: string
  displayName: string
  role: "Librarian" | "Member"
}