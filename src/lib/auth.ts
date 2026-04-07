/**
 * Auth Helper — Verify JWT signature and extract user identity from request
 *
 * Uses `jose.jwtVerify` with HS256 to verify both the signature AND the
 * `exp` claim against Django's SimpleJWT signing key (shared via the
 * `JWT_SIGNING_KEY` env var, which must equal Django's `SECRET_KEY`).
 *
 * Prior versions of this file decoded the base64 payload without
 * verification — see Bug 5 discovery report (2026-04-06). Forged tokens
 * with arbitrary `user_id` claims used to pass `getUserFromRequest`,
 * granting cross-account write access on `core_doc` and `tbl_project`.
 *
 * @created 2026-03-01
 * @updated 2026-04-06 — JWT signature verification (Bug 5)
 */

import { NextRequest } from 'next/server'
import { jwtVerify, errors as joseErrors } from 'jose'
import { sql } from '@/lib/db'

export interface RequestUser {
  userId: number
  username: string
}

// Fail loud at module load if the signing key is missing — silently
// returning null on every call would mean every authenticated route
// 401s, which is hard to diagnose. A boot-time error makes the misconfig
// obvious in dev and on Vercel preview deploys before they reach prod.
const JWT_SIGNING_KEY = process.env.JWT_SIGNING_KEY
if (!JWT_SIGNING_KEY) {
  throw new Error(
    '[auth] JWT_SIGNING_KEY env var is required. ' +
    'Set it to the same value as Django backend SECRET_KEY.'
  )
}
const encodedKey = new TextEncoder().encode(JWT_SIGNING_KEY)

/**
 * Extract user identity from a Next.js API request.
 *
 * Reads the Authorization: Bearer <token> header, verifies the JWT
 * signature with HS256 against the shared signing key, enforces the
 * `exp` claim, and returns { userId, username }. Returns null if:
 * - No Authorization header
 * - Token is malformed, signature-invalid, or expired
 * - Payload is missing user_id
 *
 * Verification errors are NOT propagated to the caller — they all
 * collapse to `null` so the call site can return a generic 401 without
 * leaking which specific check failed.
 */
export async function getUserFromRequest(request: NextRequest): Promise<RequestUser | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null

  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!match) return null

  const token = match[1]

  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ['HS256'],
      // jose enforces `exp` automatically when present.
    })

    // simplejwt uses 'user_id' as the default claim for the user's PK
    const userId = payload.user_id
    if (typeof userId !== 'number') return null

    // Username may not be in the token payload by default with simplejwt.
    // Fall back to a stringified user_id if absent. Callers that compare
    // username strings should treat that fallback with caution.
    const username = typeof payload.username === 'string' ? payload.username : String(userId)

    return { userId, username }
  } catch (err) {
    if (err instanceof joseErrors.JWTExpired) {
      // Expected — token aged out, caller should 401 and the frontend
      // should refresh via its existing /api/token/refresh flow.
      return null
    }
    if (err instanceof joseErrors.JWSSignatureVerificationFailed) {
      console.warn('[auth] JWT signature verification failed')
      return null
    }
    if (err instanceof joseErrors.JWTInvalid || err instanceof joseErrors.JWSInvalid) {
      // Malformed token — not fatal, just means unauthenticated.
      return null
    }
    // Unknown failure — log without leaking error details to the client.
    console.error('[auth] JWT verification error:', err)
    return null
  }
}

/**
 * Verify that a user owns (or is admin of) a given project.
 *
 * Returns true only if the project's `created_by_id` matches the user's ID.
 * NULL `created_by_id` is treated as a hard deny — Bug 5 discovery
 * confirmed there are no NULL rows in production today, and a follow-up
 * migration adds a NOT NULL constraint. Until that migration lands, this
 * still denies rather than bypasses, so any sneak-in NULL row is safe.
 */
export async function userOwnsProject(
  userId: number,
  projectId: number
): Promise<boolean> {
  const rows = await sql`
    SELECT created_by_id
    FROM landscape.tbl_project
    WHERE project_id = ${projectId}
    LIMIT 1
  `
  if (rows.length === 0) return false

  const ownerId = rows[0].created_by_id
  if (ownerId === null || ownerId === undefined) {
    console.error(`[auth] Project ${projectId} has NULL created_by_id — denying access`)
    return false
  }
  return ownerId === userId
}
