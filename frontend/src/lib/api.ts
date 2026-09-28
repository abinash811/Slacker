import { getCurrentUserEmail } from '@/lib/devUser'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const email = getCurrentUserEmail()
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(email ? { 'X-Dev-User-Email': email } : {}),
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new ApiError(res.status, body || res.statusText)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

export function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

/**
 * Turns any thrown value into one human sentence for error UI.
 * FastAPI errors arrive as `{"detail": "..."}` or `{"detail": [{"msg": "..."}]}`.
 */
export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    try {
      const detail = JSON.parse(error.message).detail
      if (typeof detail === 'string') return detail
      if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg)
    } catch {
      // Not JSON — fall through to status-based copy.
    }
    if (error.status >= 500) return 'The server ran into a problem. Try again in a moment.'
    if (error.status === 404) return "It may have been deleted, or the link is wrong."
    if (error.status === 403) return "You don't have permission to do that."
    return error.message || 'Something went wrong.'
  }
  if (error instanceof TypeError) return "Can't reach the server. Check your connection and try again."
  return 'Something went wrong. Try again.'
}
