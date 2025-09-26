import { NextResponse } from 'next/server'
import { sql } from '../../../lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = Number(searchParams.get('project_id'))
    if (!projectId) return NextResponse.json({})

    const rows = await sql`
      SELECT project_id, commission_basis, demand_unit, uom,
             dvl_per_year, dvl_per_quarter, dvl_per_month, updated_at
      FROM landscape.market_assumptions
      WHERE project_id = ${projectId}
      LIMIT 1
    `
    return NextResponse.json(rows?.[0] ?? {})
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Assumptions GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch assumptions', details: msg }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { project_id, commission_basis, demand_unit, uom, dvl_per_year, dvl_per_quarter, dvl_per_month } = body ?? {}
    if (!project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

    const rows = await sql`
      INSERT INTO landscape.market_assumptions (
        project_id, commission_basis, demand_unit, uom,
        dvl_per_year, dvl_per_quarter, dvl_per_month
      )
      VALUES (
        ${project_id}, ${commission_basis}, ${demand_unit}, ${uom},
        ${dvl_per_year}, ${dvl_per_quarter}, ${dvl_per_month}
      )
      ON CONFLICT (project_id) DO UPDATE SET
        commission_basis = EXCLUDED.commission_basis,
        demand_unit = EXCLUDED.demand_unit,
        uom = EXCLUDED.uom,
        dvl_per_year = EXCLUDED.dvl_per_year,
        dvl_per_quarter = EXCLUDED.dvl_per_quarter,
        dvl_per_month = EXCLUDED.dvl_per_month,
        updated_at = NOW()
      RETURNING project_id, commission_basis, demand_unit, uom,
                dvl_per_year, dvl_per_quarter, dvl_per_month, updated_at
    `
    return NextResponse.json(rows?.[0] ?? { success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Assumptions POST error:', err)
    return NextResponse.json({ error: 'Failed to save assumptions', details: msg }, { status: 500 })
  }
}
