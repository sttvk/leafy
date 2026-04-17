// Rules matching ASP.NET Identity config in DependencyInjection.cs:
// RequiredLength=8, RequireDigit=true, RequireLowercase=true,
// RequireUppercase=true, RequireNonAlphanumeric=false

import { MESSAGES } from "@/lib/messages"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(value: string): string | null {
  if (!value.trim()) return MESSAGES.validation.required("Email")
  if (!EMAIL_REGEX.test(value)) return MESSAGES.validation.email
  return null
}

export function validatePassword(value: string): string | null {
  if (!value) return MESSAGES.validation.required("Password")
  if (value.length < 8) return MESSAGES.validation.passwordMin
  if (!/[A-Z]/.test(value)) return MESSAGES.validation.passwordUppercase
  if (!/[a-z]/.test(value)) return MESSAGES.validation.passwordLowercase
  if (!/\d/.test(value)) return MESSAGES.validation.passwordDigit
  return null
}

export function validateFullName(value: string): string | null {
  if (!value.trim()) return MESSAGES.validation.required("Full name")
  if (value.trim().length < 2) return MESSAGES.validation.nameMin
  return null
}

export function validateRequired(value: string, label: string): string | null {
  if (!value.trim()) return MESSAGES.validation.required(label)
  return null
}

export function validateYear(value: string): string | null {
  if (!value.trim()) return null
  const year = Number(value)
  if (!Number.isInteger(year) || year < 1000 || year > new Date().getFullYear()) {
    return MESSAGES.validation.yearInvalid
  }
  return null
}

export function validateUrl(value: string): string | null {
  if (!value.trim()) return null
  if (!/^https?:\/\/.+/.test(value)) return MESSAGES.validation.urlInvalid
  return null
}
