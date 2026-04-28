/**
 * Client-side utility to get auth headers for Next.js API route calls.
 *
 * Reads the JWT access token from localStorage and returns an Authorization
 * header. Returns empty object if not authenticated.
 */
export function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};

  try {
    const stored = localStorage.getItem('auth_tokens');
    if (!stored) return {};
    const { access } = JSON.parse(stored);
    if (!access) return {};
    return { Authorization: `Bearer ${access}` };
  } catch {
    return {};
  }
}

/**
 * Clear stale auth state and redirect to /login?expired=1.
 *
 * Call this from anywhere a 401 surfaces on a request the user expected to be
 * authenticated (token aged out, was revoked, refresh failed, etc.). Without
 * this, the app silently renders empty data and the user thinks the app is
 * broken — see UNIFIED_UI_TEST_FINDINGS_2026-04-27 finding #13.
 *
 * Safe to call multiple times: skips work if already on /login, and clears
 * tokens before redirect to prevent re-fire loops on the next page load.
 */
export function redirectToLoginExpired(): void {
  if (typeof window === 'undefined') return;
  // Avoid redirect loops if we're already on /login (e.g. an authed fetch
  // somehow fired from the login page itself).
  if (window.location.pathname.startsWith('/login')) return;

  // Clear auth state before redirecting so the login page renders fresh and
  // the next authed fetch (if one races us) doesn't repeat the cycle.
  try {
    localStorage.removeItem('auth_tokens');
    localStorage.removeItem('activeProjectId');
    localStorage.removeItem('activeProjectTimestamp');
  } catch {
    // ignore — localStorage may be inaccessible (private mode, etc.)
  }
  document.cookie = 'auth_token_exists=; path=/; max-age=0; SameSite=Lax';

  window.location.href = '/login?expired=1';
}
