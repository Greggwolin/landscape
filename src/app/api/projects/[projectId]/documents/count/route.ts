/**
 * Document Count API
 *
 * GET /api/projects/[projectId]/documents/count
 *
 * Returns the count of active documents for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    const result = await sql<{ count: string }[]>`
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
