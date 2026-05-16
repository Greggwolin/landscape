/**
 * Document Count API
 *
 * GET /api/projects/[projectId]/documents/count
 *
 * Returns the count of active documents for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

import { requireAuth, requireProjectAccess } from '@/lib/api/requireAuth';
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId: __projectIdParam } = await params;
  const __auth = await requireProjectAccess(_request, __projectIdParam);
  if (__auth instanceof NextResponse) return __auth;

  try {
    const { projectId } = await params;

    const result = await sql`
      SELECT COUNT(*) as count
      FROM landscape.core_doc
      WHERE project_id = ${projectId}::bigint
    `;

    const count = parseInt(result[0]?.count || '0', 10);

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Document count error:', error);
    return NextResponse.json({ count: 0 });
  }
}
