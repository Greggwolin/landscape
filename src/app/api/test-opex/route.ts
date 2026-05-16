import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

import { requireAuth } from '@/lib/api/requireAuth';
export async function GET(request: NextRequest) {
  const __auth = await requireAuth(request);
  if (__auth instanceof NextResponse) return __auth;
  // TODO(LSCMD-AUTH-ROLLOUT-Phase3.5): scope query by __auth.userId

  try {
    const result = await sql`SELECT COUNT(*) as count FROM landscape.tbl_operating_expenses`;
    const projectCheck = await sql`SELECT project_id, project_name FROM landscape.tbl_project WHERE project_id = 11`;

    return NextResponse.json({
      opex_count: result[0]?.count || 0,
      project: projectCheck[0] || null,
      success: true
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
      success: false
    }, { status: 500 });
  }
}
