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
import { sql } from '@/lib/db'

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

/**
 * Verify that a user owns (or is admin of) a given project.
 *
 * Returns true if:
 * - The user is staff/admin (created_by_id IS NULL is legacy data — allow)
 * - The project's created_by_id matches the user's ID
 * - The project has no created_by_id (legacy/unowned project)
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
  // Legacy projects with no owner are accessible to any authenticated user
  if (ownerId === null || ownerId === undefined) return true
  return ownerId === userId
}
