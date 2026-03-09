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
