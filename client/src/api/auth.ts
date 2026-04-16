import { apiClient } from "@/api/client"
import type { AuthResponse, AuthUser } from "@/types/auth"

export function registerUser(
  email: string,
  password: string,
  displayName: string
): Promise<AuthResponse> {
  return apiClient.post<AuthResponse>("/api/auth/register", {
    email,
    password,
    displayName,
  })
}

export function loginUser(
  email: string,
  password: string
): Promise<AuthResponse> {
  return apiClient.post<AuthResponse>("/api/auth/login", { email, password })
}

export function googleLogin(idToken: string): Promise<AuthResponse> {
  return apiClient.post<AuthResponse>("/api/auth/google", { idToken })
}

export function getProfile(): Promise<AuthUser> {
  return apiClient.get<AuthUser>("/api/auth/me")
}
