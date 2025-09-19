'use client'

export async function fetchJson<T = unknown>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  const contentType = response.headers.get('content-type') ?? ''
  const raw = await response.text()

  if (!response.ok) {
    const preview = raw.slice(0, 200)
    throw new Error(`Request failed with ${response.status}: ${preview}`)
  }

  try {
    return JSON.parse(raw) as T
  } catch (error) {
    const preview = raw.slice(0, 200)
    console.error('fetchJson expected JSON but received:', preview)
    throw new Error('Received non-JSON response from server. See console for details.')
  }
}
