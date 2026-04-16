const TOKEN_KEY = "lms_token"

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

function clearTokenAndRedirect(): void {
  localStorage.removeItem(TOKEN_KEY)
  window.location.href = "/login"
}

interface ApiClientOptions {
  headers?: Record<string, string>
}

async function request<T>(
  method: string,
  url: string,
  body?: unknown,
  options?: ApiClientOptions
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options?.headers,
  }

  const token = getToken()
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (response.status === 401) {
    clearTokenAndRedirect()
    throw new Error("Unauthorized")
  }

  if (!response.ok) {
    const errorBody: unknown = await response.json().catch(() => null)
    const message =
      errorBody !== null &&
      typeof errorBody === "object" &&
      "message" in errorBody &&
      typeof (errorBody as Record<string, unknown>).message === "string"
        ? (errorBody as Record<string, string>).message
        : `Request failed: ${response.status} ${response.statusText}`
    throw Object.assign(new Error(message), { status: response.status, body: errorBody })
  }

  if (response.status === 204) {
    return undefined as T
  }

  const data: unknown = await response.json()
  return data as T
}

export const apiClient = {
  get<T>(url: string, options?: ApiClientOptions): Promise<T> {
    return request<T>("GET", url, undefined, options)
  },
  post<T>(url: string, body?: unknown, options?: ApiClientOptions): Promise<T> {
    return request<T>("POST", url, body, options)
  },
  put<T>(url: string, body?: unknown, options?: ApiClientOptions): Promise<T> {
    return request<T>("PUT", url, body, options)
  },
  delete<T>(url: string, options?: ApiClientOptions): Promise<T> {
    return request<T>("DELETE", url, undefined, options)
  },
} as const
