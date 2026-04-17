const TOKEN_KEY = "lms_token"

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
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
    ...options?.headers,
  }
  if (body !== undefined) {
    headers["Content-Type"] = "application/json"
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
    clearToken()
    throw new Error("Unauthorized")
  }

  if (!response.ok) {
    const errorBody: unknown = await response.json().catch(() => null)
    let message = "Something went wrong. Please try again."

    if (typeof errorBody === "string") {
      message = errorBody
    } else if (errorBody !== null && typeof errorBody === "object") {
      const obj = errorBody as Record<string, unknown>
      if (obj.errors && typeof obj.errors === "object") {
        const firstField = Object.values(obj.errors as Record<string, string[]>)[0]
        if (firstField?.[0]) message = firstField[0]
      } else if (typeof obj.title === "string") {
        message = obj.title
      } else if (typeof obj.message === "string") {
        message = obj.message
      }
    }

    const validationErrors =
      errorBody !== null &&
      typeof errorBody === "object" &&
      "errors" in errorBody &&
      typeof (errorBody as Record<string, unknown>).errors === "object"
        ? (errorBody as Record<string, unknown>).errors as Record<string, string[]>
        : undefined

    throw Object.assign(new Error(message), {
      status: response.status,
      body: errorBody,
      validationErrors,
    })
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
