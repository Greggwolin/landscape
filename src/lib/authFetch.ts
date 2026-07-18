'use client'

/**
 * authFetch — fetch with automatic access-token refresh.
 *
 * Root cause (studio audit 2026-07-18, findings C2/C3): access tokens live
 * 1 hour (SIMPLE_JWT ACCESS_TOKEN_LIFETIME) but the app only refreshes them
 * during AuthContext initialization. Any tab open longer than an hour sends a
 * stale Bearer token on every direct-to-Django call, which 401s
 * (token_not_valid). Callers historically rendered those 401s as fake empty
 * states ("No parcels configured") or error banners.
 *
 * This wrapper:
 *  1. Attaches the current access token (via getAuthHeaders).
 *  2. On a 401, performs ONE single-flight refresh against
 *     /api/token/refresh/ and retries the original request once.
 *  3. If refresh fails, clears auth state and bounces to /login?expired=1
 *     (redirectToLoginExpired) instead of leaving the screen lying.
 *
 * Use this for every client-side call that ultimately hits Django —
 * directly (NEXT_PUBLIC_DJANGO_API_URL) or via a validating proxy route.
 * fetchJson() already routes through it, so SWR/React-Query callers get
 * refresh behavior for free.
 */

import { getAuthHeaders, redirectToLoginExpired } from './authHeaders'

const DJANGO_API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000'

/**
 * Single-flight guard: concurrent 401s share one refresh request instead of
 * racing several. The promise is cleared when the refresh settles.
 */
let refreshInFlight: Promise<boolean> | null = null

/**
 * Refresh the access token using the stored refresh token.
 * Resolves true when a new access token has been written to localStorage.
 * Safe to call concurrently — all callers await the same request.
 */
export function refreshAccessToken(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false)
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    try {
      const stored = localStorage.getItem('auth_tokens')
      if (!stored) return false
      const parsed = JSON.parse(stored) as { access?: string; refresh?: string }
      if (!parsed.refresh) return false

      const response = await fetch(`${DJANGO_API_BASE}/api/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: parsed.refresh }),
      })
      if (!response.ok) return false

      const data = (await response.json()) as { access?: string; refresh?: string }
      if (!data.access) return false

      // SIMPLE_JWT may rotate the refresh token; keep the new one if present.
      const next = { access: data.access, refresh: data.refresh ?? parsed.refresh }
      localStorage.setItem('auth_tokens', JSON.stringify(next))
      document.cookie = 'auth_token_exists=true; path=/; max-age=604800; SameSite=Lax'
      return true
    } catch {
      return false
    } finally {
      // Clear AFTER settling so racers that grabbed the promise still resolve.
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

/**
 * fetch() with auth header injection and one refresh-and-retry on 401.
 * Caller-provided headers win over the injected Authorization header.
 */
export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const doFetch = () =>
    fetch(input, {
      ...init,
      headers: { ...getAuthHeaders(), ...(init?.headers ?? {}) },
    })

  const first = await doFetch()
  if (first.status !== 401 || typeof window === 'undefined') return first

  const refreshed = await refreshAccessToken()
  if (!refreshed) {
    // Refresh token is gone or expired too — end the zombie session honestly.
    redirectToLoginExpired()
    return first
  }

  // Retry once with the fresh token (re-read from storage by getAuthHeaders).
  return doFetch()
}
