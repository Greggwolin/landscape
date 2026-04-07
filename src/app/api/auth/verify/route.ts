/**
 * GET /api/auth/verify
 *
 * Smoke-test endpoint for JWT signature verification. Mirrors
 * `getUserFromRequest` exactly — 200 if the bearer token verifies
 * against the configured `JWT_SIGNING_KEY`, 401 otherwise.
 *
 * Purpose: confirm Vercel's `JWT_SIGNING_KEY` env var matches Railway's
 * Django `SECRET_KEY` BEFORE any real route starts 401'ing users.
 * Doubles as a permanent health check for future deploys.
 *
 * @created 2026-04-06 (Bug 5 fix)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'invalid_or_expired_token' },
      { status: 401 }
    )
  }
  return NextResponse.json({
    ok: true,
    userId: user.userId,
    username: user.username,
    verifiedAt: new Date().toISOString(),
  })
}
