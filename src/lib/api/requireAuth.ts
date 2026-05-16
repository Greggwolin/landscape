/**
 * Server-side auth gate for Next.js API routes.
 *
 * Wraps `getUserFromRequest` (JWT verification, see src/lib/auth.ts) with a
 * NextResponse-returning ergonomics so route handlers can short-circuit with
 * a single conditional:
 *
 *   const auth = await requireAuth(req);
 *   if (auth instanceof NextResponse) return auth;
 *   // auth.userId is now safe to use
 *
 * `requireProjectAccess` additionally verifies the user owns the project (or
 * is staff/admin). Returns 404 — not 403 — for non-ownership so existence is
 * not leaked. PR #5's pre-existing /api/dms/docs uses 403; new code in this
 * rollout standardizes on 404.
 *
 * Staff override matches Django's `filter_qs_by_owner_or_staff` semantic:
 * is_staff OR is_superuser OR role == 'admin' bypasses the ownership check.
 *
 * @created 2026-05-16 LSCMD-AUTH-ROLLOUT-0516-Qm Phase 3
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { sql } from '@/lib/db';

export interface AuthedUser {
  userId: number;
  username: string;
  isAdmin: boolean;
}

async function fetchIsAdmin(userId: number): Promise<boolean> {
  const rows = await sql`
    SELECT is_staff, is_superuser, role
    FROM landscape.auth_user
    WHERE id = ${userId}
    LIMIT 1
  `;
  if (rows.length === 0) return false;
  const r = rows[0];
  return Boolean(r.is_staff || r.is_superuser || r.role === 'admin');
}

export async function requireAuth(req: NextRequest): Promise<AuthedUser | NextResponse> {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const isAdmin = await fetchIsAdmin(user.userId);
  return { userId: user.userId, username: user.username, isAdmin };
}

export async function requireProjectAccess(
  req: NextRequest,
  projectId: number | string | null | undefined,
): Promise<AuthedUser | NextResponse> {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const pid = typeof projectId === 'string' ? Number(projectId) : projectId;
  if (!pid || Number.isNaN(pid)) {
    return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
  }

  if (auth.isAdmin) return auth;

  const rows = await sql`
    SELECT created_by_id
    FROM landscape.tbl_project
    WHERE project_id = ${pid}
    LIMIT 1
  `;
  // 404 on both "no such project" and "exists but not yours" — do not leak
  // existence to non-owners.
  if (rows.length === 0 || rows[0].created_by_id !== auth.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return auth;
}
