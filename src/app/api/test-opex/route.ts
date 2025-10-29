import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
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
