import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

import { requireAuth, requireProjectAccess } from '@/lib/api/requireAuth';
// GET /api/project?project_id=7
export async function GET(request: NextRequest) {
  const __qProjectId = new URL(request.url).searchParams.get('project_id');
  const __auth = await requireProjectAccess(request, __qProjectId);
  if (__auth instanceof NextResponse) return __auth;

  try {
    const { searchParams } = new URL(request.url)
    const pid = searchParams.get('project_id')
    if (!pid) return NextResponse.json({ error: 'project_id required' }, { status: 400 })
    try {
      const rows = await sql`
        SELECT 
          project_id,
          project_name,
          acres_gross,
          start_date,
          jurisdiction_city,
          jurisdiction_county,
          jurisdiction_state
        FROM landscape.tbl_project
        WHERE project_id = ${pid}::bigint
        LIMIT 1
      `
      return NextResponse.json(rows?.[0] ?? {})
    } catch {
      const rows = await sql`
        SELECT project_id, project_name, acres_gross, start_date
        FROM landscape.tbl_project
        WHERE project_id = ${pid}::bigint
        LIMIT 1
      `
      const row = rows?.[0] ?? null
      if (!row) return NextResponse.json({})
      return NextResponse.json({ ...row, jurisdiction_city: null, jurisdiction_county: null, jurisdiction_state: null })
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('project current error:', e)
    return NextResponse.json({ error: 'Failed to load project', details: msg }, { status: 500 })
  }
}

