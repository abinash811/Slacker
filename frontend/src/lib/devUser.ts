/**
 * Dev-only "act as" user switcher — mirrors backend `DevAuthProvider`
 * (see backend/app/core/auth.py). Swapping to company SSO later means
 * replacing this module's `getCurrentUserEmail`/header logic, not any
 * page or API call that uses it.
 */
const STORAGE_KEY = 'slacker.devUserEmail'

export function getCurrentUserEmail(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function setCurrentUserEmail(email: string) {
  try {
    localStorage.setItem(STORAGE_KEY, email)
  } catch {
    // ignore (private browsing / storage disabled)
  }
}
