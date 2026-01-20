import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

type MinimalProjectRequest = {
  project_name: string
  analysis_type?: string
  development_type?: string
  project_type_code: string
  property_subtype?: string
  property_class?: string
  street_address?: string
  cross_streets?: string
  city?: string
  state?: string
  zip_code?: string
  county?: string
  latitude?: number | null
  longitude?: number | null
  site_area?: number | null
  site_area_unit?: 'AC' | 'SF' | 'SM'
  total_units?: number | null
  gross_sf?: number | null
  analysis_start_date?: string | null
}

const convertToAcres = (value: number | null | undefined, unit: MinimalProjectRequest['site_area_unit']): number | null => {
  if (value === null || value === undefined) return null
  if (!Number.isFinite(value)) return null
  if (!unit || unit === 'AC') return value
  if (unit === 'SF') {
    return value / 43560
  }
  if (unit === 'SM') {
    return value * 0.000247105
  }
  return value
}

const buildLocationDescription = (body: MinimalProjectRequest) => {
  if (body.street_address) {
    const parts = [body.street_address, body.city, body.state, body.zip_code].filter(Boolean)
    return parts.join(', ')
  }
  if (body.cross_streets) {
    const parts = [body.cross_streets, body.city, body.state].filter(Boolean)
    return parts.join(', ')
  }
  if (body.latitude !== undefined && body.longitude !== undefined) {
    return `${body.latitude?.toFixed(6)}, ${body.longitude?.toFixed(6)}`
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as MinimalProjectRequest

    console.log('=== PROJECT CREATION TRACE ===')
    console.log('PROJECT INPUT BODY:', JSON.stringify(body, null, 2))
    console.log('RECEIVED LATITUDE:', body.latitude, 'type:', typeof body.latitude)
    console.log('RECEIVED LONGITUDE:', body.longitude, 'type:', typeof body.longitude)

    if (!body.project_name || !body.project_type_code) {
      return NextResponse.json(
        { error: 'project_name and project_type_code are required' },
        { status: 400 }
      )
    }

    const acresGross = convertToAcres(body.site_area ?? null, body.site_area_unit)
    const locationDescription = buildLocationDescription(body)
    const latitude = typeof body.latitude === 'number' && Number.isFinite(body.latitude) ? body.latitude : null
    const longitude = typeof body.longitude === 'number' && Number.isFinite(body.longitude) ? body.longitude : null

    console.log('FINAL LATITUDE TO INSERT:', latitude)
    console.log('FINAL LONGITUDE TO INSERT:', longitude)
    console.log('=== END PROJECT CREATION TRACE ===')
    const streetAddress = body.street_address?.trim() || null
    const city = body.city?.trim() || null
    const state = body.state?.trim()?.toUpperCase() || null
    const zipCode = body.zip_code?.trim() || null
    const county = body.county?.trim()?.replace(/\s*county$/i, '') || null  // Strip "County" suffix if present
    const totalUnits = typeof body.total_units === 'number' && Number.isFinite(body.total_units)
      ? Math.round(body.total_units)
      : null
    const grossSf = typeof body.gross_sf === 'number' && Number.isFinite(body.gross_sf)
      ? Math.round(body.gross_sf)
      : null
    const jurisdictionCity = city
    const jurisdictionState = state
    const jurisdictionCounty = county

    const inserted = await sql<{
      project_id: number
      project_name: string
      project_type_code: string | null
      analysis_mode: string
    }[]>`
      INSERT INTO landscape.tbl_project (
        project_name,
        project_type_code,
        project_type,
        analysis_type,
        property_subtype,
        property_class,
        street_address,
        city,
        state,
        zip_code,
        location_description,
        jurisdiction_city,
        jurisdiction_state,
        jurisdiction_county,
        acres_gross,
        location_lat,
        location_lon,
        total_units,
        gross_sf,
        analysis_start_date,
        analysis_mode,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        ${body.project_name},
        ${body.project_type_code},
        ${body.property_subtype || body.development_type || null},
        ${body.analysis_type || null},
        ${body.property_subtype || null},
        ${body.property_class || null},
        ${streetAddress},
        ${city},
        ${state},
        ${zipCode},
        ${locationDescription},
        ${jurisdictionCity},
        ${jurisdictionState},
        ${jurisdictionCounty},
        ${acresGross},
        ${latitude},
        ${longitude},
        ${totalUnits},
        ${grossSf},
        ${body.analysis_start_date || null},
        'napkin',
        true,
        NOW(),
        NOW()
      )
      RETURNING project_id, project_name, project_type_code, analysis_mode
    `

    if (inserted.length === 0) {
      throw new Error('Failed to create project')
    }

    return NextResponse.json({
      project: inserted[0]
    })
  } catch (error: unknown) {
    console.error('Minimal project creation failed:', error)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Failed to create project', details: message },
      { status: 500 }
    )
  }
}
