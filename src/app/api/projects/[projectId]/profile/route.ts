/**
 * Project Profile API
 *
 * GET /api/projects/[projectId]/profile
 * PATCH /api/projects/[projectId]/profile
 *
 * Handles reading and updating project profile metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { geocodeLocation } from '@/lib/geocoding';

export interface ProjectProfile {
  project_id: number;
  project_name: string;
  project_number?: string;
  analysis_type?: string;
  property_subtype?: string;
  project_type?: string; // LAND, MF, OFF, etc.
  project_status?: string;
  target_units?: number; // For development projects (planned units)
  total_units?: number; // For operating projects (actual units)
  calculated_units?: number; // Calculated from tbl_multifamily_unit
  gross_acres?: number;
  asking_price?: number; // Initial asking price (before acquisition closes)
  address?: string;
  city?: string;
  county?: string;
  state?: string;
  zip_code?: string;
  start_date?: string | null;
  analysis_start_date?: string | null;
  analysis_end_date?: string | null;
  msa_id?: number;
  msa_name?: string; // Joined from tbl_msa
  state_abbreviation?: string; // Joined from tbl_msa
  market?: string; // Free text market field (fallback when no MSA)
  submarket?: string; // Free text submarket field
  apn?: string;
  ownership_type?: string;
  created_at?: Date;
  updated_at?: Date;
}

/**
 * GET /api/projects/[projectId]/profile
 * Returns project profile with MSA joined
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    const profiles = await sql<ProjectProfile[]>`
      SELECT
        p.project_id,
        p.project_name,
        p.analysis_type,
        p.property_subtype,
        p.project_type,
        p.target_units,
        p.total_units,
        (SELECT COUNT(*)::integer FROM landscape.tbl_multifamily_unit u WHERE u.project_id = p.project_id) as calculated_units,
        p.acres_gross as gross_acres,
        p.asking_price,
        COALESCE(p.street_address, p.project_address) as address,
        COALESCE(p.city, p.jurisdiction_city) as city,
        COALESCE(p.county, p.jurisdiction_county) as county,
        p.state,
        p.zip_code,
        p.start_date,
        p.analysis_start_date,
        p.analysis_end_date,
        p.msa_id,
        m.msa_name,
        m.state_abbreviation,
        p.market,
        p.submarket,
        COALESCE(p.apn_primary, '') as apn,
        p.ownership_type,
        p.created_at,
        p.updated_at
      FROM landscape.tbl_project p
      LEFT JOIN landscape.tbl_msa m ON p.msa_id = m.msa_id
      WHERE p.project_id = ${projectId}::bigint
    `;

    if (profiles.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(profiles[0]);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Project profile GET error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch project profile',
        details: message
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/projects/[projectId]/profile
 * Updates project profile fields (partial update)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await request.json().catch(() => ({}));

    // Build dynamic UPDATE query for only provided fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Map frontend field names to database column names
    const fieldMapping: Record<string, string> = {
      'project_name': 'project_name',
      'analysis_type': 'analysis_type',
      'property_subtype': 'property_subtype',
      'target_units': 'target_units',
      'gross_acres': 'acres_gross',
      'asking_price': 'asking_price',
      'address': 'street_address',
      'city': 'city',
      'county': 'county',
      'state': 'state',
      'zip_code': 'zip_code',
      'start_date': 'start_date',
      'analysis_start_date': 'analysis_start_date',
      'analysis_end_date': 'analysis_end_date',
      'msa_id': 'msa_id',
      'apn': 'apn_primary',
      'ownership_type': 'ownership_type'
    };

    for (const [frontendField, dbColumn] of Object.entries(fieldMapping)) {
      if (body[frontendField] !== undefined) {
        updates.push(`${dbColumn} = $${paramCount}`);
        values.push(body[frontendField]);
        paramCount++;
      }
    }

    // Auto-sync project_type_code when analysis_type or property_subtype changes
    // This ensures data consistency between Dashboard and Profile views
    if (body.analysis_type !== undefined || body.property_subtype !== undefined) {
      // Fetch current values if needed
      const current = await sql<{ analysis_type: string; property_subtype: string | null }[]>`
        SELECT analysis_type, property_subtype
        FROM landscape.tbl_project
        WHERE project_id = ${projectId}::bigint
      `;

      const analysisType = body.analysis_type || current[0]?.analysis_type;
      const propertySubtype = body.property_subtype || current[0]?.property_subtype;

      // Determine correct project_type_code based on analysis_type and property_subtype
      let projectTypeCode = 'LAND'; // default

      if (analysisType === 'Income Property') {
        // Map property_subtype to project_type_code for income properties
        if (propertySubtype?.toLowerCase().includes('office')) {
          projectTypeCode = 'OFF';
        } else if (propertySubtype?.toLowerCase().includes('multifamily') || propertySubtype?.toLowerCase().includes('garden')) {
          projectTypeCode = 'MF';
        } else if (propertySubtype?.toLowerCase().includes('retail')) {
          projectTypeCode = 'RET';
        } else if (propertySubtype?.toLowerCase().includes('industrial') || propertySubtype?.toLowerCase().includes('warehouse')) {
          projectTypeCode = 'IND';
        } else if (propertySubtype?.toLowerCase().includes('hotel') || propertySubtype?.toLowerCase().includes('hospitality')) {
          projectTypeCode = 'HTL';
        } else if (propertySubtype?.toLowerCase().includes('mixed')) {
          projectTypeCode = 'MXU';
        }
      } else if (analysisType === 'Land Development') {
        projectTypeCode = 'LAND';
      }

      // Add project_type_code to updates
      updates.push(`project_type_code = $${paramCount}`);
      values.push(projectTypeCode);
      paramCount++;
    }

    // Auto-geocode when address, city, or county changes
    // This populates location_lat and location_lon for map display
    if (
      body.address !== undefined ||
      body.city !== undefined ||
      body.county !== undefined ||
      body.state !== undefined ||
      body.zip_code !== undefined
    ) {
      // Fetch current values to build complete address
      const current = await sql<{
        street_address: string | null;
        city: string | null;
        county: string | null;
        state: string | null;
        zip_code: string | null;
        jurisdiction_city: string | null;
        jurisdiction_county: string | null;
        jurisdiction_state: string | null;
      }[]>`
        SELECT street_address, city, county, state, zip_code, jurisdiction_city, jurisdiction_county, jurisdiction_state
        FROM landscape.tbl_project
        WHERE project_id = ${projectId}::bigint
      `;

      const address = body.address || current[0]?.street_address;
      const city = body.city || current[0]?.city || current[0]?.jurisdiction_city;
      const county = body.county || current[0]?.county || current[0]?.jurisdiction_county;
      const state = body.state || current[0]?.state || current[0]?.jurisdiction_state;
      const zipCode = body.zip_code || current[0]?.zip_code;

      // Build address string for geocoding
      if (address && city) {
        const fullAddress = [address, city, state, zipCode, county].filter(Boolean).join(', ');
        console.log(`🌍 Geocoding project ${projectId} address: ${fullAddress}`);

        try {
          const geocodeResult = await geocodeLocation(fullAddress);

          if (geocodeResult) {
            console.log(`✅ Geocoded to: ${geocodeResult.latitude}, ${geocodeResult.longitude} (source: ${geocodeResult.source})`);

            // Add location coordinates to updates
            updates.push(`location_lat = $${paramCount}`);
            values.push(geocodeResult.latitude);
            paramCount++;

            updates.push(`location_lon = $${paramCount}`);
            values.push(geocodeResult.longitude);
            paramCount++;
          } else {
            console.log(`⚠️ Could not geocode address: ${fullAddress}`);
          }
        } catch (error) {
          console.error('Geocoding error:', error);
          // Don't fail the whole update if geocoding fails
        }
      }
    }

    // Always update updated_at
    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) {
      // Only updated_at, no actual fields changed
      return NextResponse.json({ ok: true, message: 'No fields to update' });
    }

    // Add projectId as final parameter
    values.push(projectId);

    // Execute update
    await sql.query(
      `UPDATE landscape.tbl_project
       SET ${updates.join(', ')}
       WHERE project_id = $${paramCount}::bigint`,
      values
    );

    // Return updated profile
    const updatedProfiles = await sql<ProjectProfile[]>`
      SELECT
        p.project_id,
        p.project_name,
        p.analysis_type,
        p.property_subtype,
        p.project_type,
        p.target_units,
        p.total_units,
        (SELECT COUNT(*)::integer FROM landscape.tbl_multifamily_unit u WHERE u.project_id = p.project_id) as calculated_units,
        p.acres_gross as gross_acres,
        p.asking_price,
        COALESCE(p.street_address, p.project_address) as address,
        COALESCE(p.city, p.jurisdiction_city) as city,
        COALESCE(p.county, p.jurisdiction_county) as county,
        p.state,
        p.zip_code,
        p.start_date,
        p.analysis_start_date,
        p.analysis_end_date,
        p.msa_id,
        m.msa_name,
        m.state_abbreviation,
        p.market,
        p.submarket,
        COALESCE(p.apn_primary, '') as apn,
        p.ownership_type,
        p.updated_at
      FROM landscape.tbl_project p
      LEFT JOIN landscape.tbl_msa m ON p.msa_id = m.msa_id
      WHERE p.project_id = ${projectId}::bigint
    `;

    return NextResponse.json({
      ok: true,
      profile: updatedProfiles[0]
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Project profile PATCH error:', error);

    return NextResponse.json(
      {
        error: 'Failed to update project profile',
        details: message
      },
      { status: 500 }
    );
  }
}
