/**
 * Auth Helper — Extract user identity from request JWT
 *
 * Decodes the JWT payload (base64) without signature verification.
 * Signature verification is Django's responsibility — Next.js API routes
 * only need the user identity for ownership tagging and access control.
 *
 * @created 2026-03-01
 */

import { NextRequest } from 'next/server'

export interface RequestUser {
  userId: number
  username: string
}

/**
 * Extract user identity from a Next.js API request.
 *
 * Reads the Authorization: Bearer <token> header, decodes the JWT payload,
 * and returns { userId, username }. Returns null if:
 * - No Authorization header
 * - Token is malformed or not a valid JWT
 * - Payload is missing user_id
 *
 * Does NOT verify the JWT signature — Django is the auth authority.
 */
export function getUserFromRequest(request: NextRequest): RequestUser | null {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader) return null

  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!match) return null

  const token = match[1]

  try {
    // JWT structure: header.payload.signature — we only need the payload
    const parts = token.split('.')
    if (parts.length !== 3) return null

    // Decode base64url payload
    const payloadB64 = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const payloadJson = Buffer.from(payloadB64, 'base64').toString('utf-8')
    const payload = JSON.parse(payloadJson)

    // simplejwt uses 'user_id' as the default claim for the user's PK
    const userId = payload.user_id
    if (typeof userId !== 'number') return null

    // Username may not be in the token payload by default with simplejwt.
    // Query it from the DB if needed, but for now store the user_id as a string
    // if username is absent.
    const username: string = payload.username ?? String(userId)

    return { userId, username }
  } catch {
    // Malformed token — not fatal, just means unauthenticated
    return null
  }
}
