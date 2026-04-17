export interface AuthUser {
  id: string
  email: string
  displayName: string
  role: string
}

export interface AuthResponse {
  token: string
  email: string
  displayName: string
  role: string
}