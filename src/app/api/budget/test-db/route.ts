import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

import { requireAuth } from '@/lib/api/requireAuth';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const __auth = await requireAuth(request);
  if (__auth instanceof NextResponse) return __auth;
  // TODO(LSCMD-AUTH-ROLLOUT-Phase3.5): scope query by __auth.userId

  try {
    const result = await sql`
      SELECT COUNT(*) as count
      FROM landscape.core_fin_fact_budget
      WHERE project_id = 7 AND division_id IS NULL
    `;

    return NextResponse.json({
      success: true,
      count: result[0]?.count || 0
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
