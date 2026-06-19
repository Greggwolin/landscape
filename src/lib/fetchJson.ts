'use client'

import { getAuthHeaders } from './authHeaders'

export async function fetchJson<T = unknown>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  // Inject the canonical auth header by default so SWR/React-Query callers that
  // pass no init still authenticate. Caller-provided headers win (spread last),
  // and getAuthHeaders() returns {} on the server, so SSR is unaffected.
  const response = await fetch(input, {
    ...init,
    headers: { ...getAuthHeaders(), ...(init?.headers ?? {}) },
  })
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
