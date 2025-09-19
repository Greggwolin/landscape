// /app/api/projects/[id]/route.ts
import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

type Params = { params: { id: string } }

export async function PATCH(req: Request, context: Params) {
  try {
    const id = context.params.id
    if (!id) return NextResponse.json({ error: 'project id required' }, { status: 400 })

    const body = await req.json()
    const { 
      project_name, 
      acres_gross, 
      location_lat,
      location_lon,
      start_date, 
      jurisdiction_city, 
      jurisdiction_county, 
      jurisdiction_state 
    } = body

    // Build dynamic SET clause based on provided fields
    const updates = []
    const values = []
    let paramIndex = 1

    if (project_name !== undefined) {
      updates.push(`project_name = $${paramIndex++}`)
      values.push(project_name)
    }
    if (acres_gross !== undefined) {
      updates.push(`acres_gross = $${paramIndex++}`)
      values.push(acres_gross)
    }
    if (location_lat !== undefined) {
      updates.push(`location_lat = $${paramIndex++}`)
      values.push(location_lat)
    }
    if (location_lon !== undefined) {
      updates.push(`location_lon = $${paramIndex++}`)
      values.push(location_lon)
    }
    if (start_date !== undefined) {
      updates.push(`start_date = $${paramIndex++}`)
      values.push(start_date)
    }
    if (jurisdiction_city !== undefined) {
      updates.push(`jurisdiction_city = $${paramIndex++}`)
      values.push(jurisdiction_city)
    }
    if (jurisdiction_county !== undefined) {
      updates.push(`jurisdiction_county = $${paramIndex++}`)
      values.push(jurisdiction_county)
    }
    if (jurisdiction_state !== undefined) {
      updates.push(`jurisdiction_state = $${paramIndex++}`)
      values.push(jurisdiction_state)
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // Add the WHERE clause parameter
    values.push(id)
    const whereIndex = paramIndex

    // Execute update with template literal
    let result;
    if (project_name !== undefined && updates.length === 1) {
      result = await sql`
        UPDATE landscape.tbl_project 
        SET project_name = ${project_name}
        WHERE project_id = ${id}::bigint
        RETURNING *
      `
    } else if (acres_gross !== undefined && updates.length === 1) {
      result = await sql`
        UPDATE landscape.tbl_project 
        SET acres_gross = ${acres_gross}
        WHERE project_id = ${id}::bigint
        RETURNING *
      `
    } else if (location_lat !== undefined && updates.length === 1) {
      result = await sql`
        UPDATE landscape.tbl_project 
        SET location_lat = ${location_lat}
        WHERE project_id = ${id}::bigint
        RETURNING *
      `
    } else if (location_lon !== undefined && updates.length === 1) {
      result = await sql`
        UPDATE landscape.tbl_project 
        SET location_lon = ${location_lon}
        WHERE project_id = ${id}::bigint
        RETURNING *
      `
    } else if (start_date !== undefined && updates.length === 1) {
      result = await sql`
        UPDATE landscape.tbl_project 
        SET start_date = ${start_date}
        WHERE project_id = ${id}::bigint
        RETURNING *
      `
    } else if (jurisdiction_city !== undefined && jurisdiction_county !== undefined && jurisdiction_state !== undefined) {
      result = await sql`
        UPDATE landscape.tbl_project 
        SET jurisdiction_city = ${jurisdiction_city},
            jurisdiction_county = ${jurisdiction_county},
            jurisdiction_state = ${jurisdiction_state}
        WHERE project_id = ${id}::bigint
        RETURNING *
      `
    } else {
      // Multiple field update - construct manually
      const fields = []
      const vals = []
      if (project_name !== undefined) { fields.push('project_name'); vals.push(project_name); }
      if (acres_gross !== undefined) { fields.push('acres_gross'); vals.push(acres_gross); }
      if (start_date !== undefined) { fields.push('start_date'); vals.push(start_date); }
      
      if (fields.length === 2 && fields.includes('project_name') && fields.includes('acres_gross')) {
        result = await sql`
          UPDATE landscape.tbl_project 
          SET project_name = ${project_name}, acres_gross = ${acres_gross}
          WHERE project_id = ${id}::bigint
          RETURNING *
        `
      } else {
        return NextResponse.json({ error: 'Unsupported field combination for update' }, { status: 400 })
      }
    }
    
    return NextResponse.json(result[0])
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Project PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update project', details: message }, { status: 500 })
  }
}

export async function GET(_req: Request, context: Params) {
  try {
    const id = context.params.id
    if (!id) return NextResponse.json({ error: 'project id required' }, { status: 400 })

    // Try to select jurisdiction fields if present; fall back gracefully.
    try {
      const rows = await sql`
        SELECT 
          project_id,
          project_name,
          acres_gross,
          location_lat,
          location_lon,
          start_date,
          jurisdiction_city,
          jurisdiction_county,
          jurisdiction_state
        FROM landscape.tbl_project
        WHERE project_id = ${id}::bigint
        LIMIT 1
      `
      return NextResponse.json(rows?.[0] ?? {})
    } catch {
      const rows = await sql`
        SELECT 
          project_id,
          project_name,
          acres_gross,
          location_lat,
          location_lon,
          start_date
        FROM landscape.tbl_project
        WHERE project_id = ${id}::bigint
        LIMIT 1
      `
      // Backfill jurisdiction fields as null if not present in schema
      const row = rows?.[0] ?? null
      if (!row) return NextResponse.json({})
      return NextResponse.json({
        ...row,
        jurisdiction_city: null,
        jurisdiction_county: null,
        jurisdiction_state: null,
      })
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Project GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch project', details: message }, { status: 500 })
  }
}

