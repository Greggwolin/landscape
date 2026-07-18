'use client'

import { authFetch } from './authFetch'

export async function fetchJson<T = unknown>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  // authFetch injects the canonical auth header (caller-provided headers win)
  // AND transparently refreshes an expired access token, retrying once — so
  // SWR/React-Query callers survive sessions longer than the 1-hour token
  // lifetime instead of 401ing (studio audit 2026-07-18, C2/C3 root cause).
  const response = await authFetch(input, init)
  // const contentType = response.headers.get('content-type') ?? ''
  const raw = await response.text()

  if (!response.ok) {
    const preview = raw.slice(0, 200)
    throw new Error(`Request failed with ${response.status}: ${preview}`)
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    const preview = raw.slice(0, 200)
    // Only log in development - in production this should go to error tracking
    if (process.env.NODE_ENV === 'development') {
      console.error('fetchJson expected JSON but received:', preview)
    }
    throw new Error('Received non-JSON response from server')
  }
}
