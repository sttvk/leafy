// Rules matching ASP.NET Identity config in DependencyInjection.cs:
// RequiredLength=8, RequireDigit=true, RequireLowercase=true,
// RequireUppercase=true, RequireNonAlphanumeric=false

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(value: string): string | null {
  if (!value.trim()) return "Email is required"
  if (!EMAIL_REGEX.test(value)) return "Enter a valid email address"
  return null
}

export function validatePassword(value: string): string | null {
  if (!value) return "Password is required"
  if (value.length < 8) return "Must be at least 8 characters"
  if (!/[A-Z]/.test(value)) return "Must contain an uppercase letter"
  if (!/[a-z]/.test(value)) return "Must contain a lowercase letter"
  if (!/\d/.test(value)) return "Must contain a number"
  return null
}

export function validateFullName(value: string): string | null {
  if (!value.trim()) return "Full name is required"
  if (value.trim().length < 2) return "Must be at least 2 characters"
  return null
}

export function validateRequired(value: string, label: string): string | null {
  if (!value.trim()) return `${label} is required`
  return null
}

export function validateYear(value: string): string | null {
  if (!value.trim()) return null
  const year = Number(value)
  if (!Number.isInteger(year) || year < 1000 || year > new Date().getFullYear()) {
    return "Enter a valid year"
  }
  return null
}

export function validateUrl(value: string): string | null {
  if (!value.trim()) return null
  if (!/^https?:\/\/.+/.test(value)) return "Must start with http:// or https://"
  return null
}
