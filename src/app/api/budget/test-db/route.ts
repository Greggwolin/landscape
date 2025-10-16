import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await sql`
      SELECT COUNT(*) as count
      FROM landscape.core_fin_fact_budget
      WHERE project_id = 7 AND container_id IS NULL
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
