import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import type { ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { AuthUser } from "@/types/auth"
import * as authApi from "@/api/auth"
import { MESSAGES } from "@/lib/messages"

const TOKEN_KEY = "lms_token"

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isLibrarian: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<void>
  googleLogin: (idToken: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setIsLoading(false)
      return
    }

    authApi
      .getProfile()
      .then((profile) => {
        setUser(profile)
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY)
        setUser(null)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.loginUser(email, password)
    localStorage.setItem(TOKEN_KEY, response.token)
    const profile = await authApi.getProfile()
    setUser(profile)
  }, [])

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      const response = await authApi.registerUser(email, password, displayName)
      localStorage.setItem(TOKEN_KEY, response.token)
      const profile = await authApi.getProfile()
      setUser(profile)
    },
    []
  )

  const handleGoogleLogin = useCallback(async (idToken: string) => {
    const response = await authApi.googleLogin(idToken)
    localStorage.setItem(TOKEN_KEY, response.token)
    const profile = await authApi.getProfile()
    setUser(profile)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
    queryClient.clear()
    toast.success(MESSAGES.auth.logoutSuccess)
    navigate("/")
  }, [navigate, queryClient])

  const isAuthenticated = user !== null
  const isLibrarian = user?.role === "Librarian"

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated,
      isLibrarian,
      isLoading,
      login,
      register,
      googleLogin: handleGoogleLogin,
      logout,
    }),
    [user, isAuthenticated, isLibrarian, isLoading, login, register, handleGoogleLogin, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export { AuthProvider, useAuth }
