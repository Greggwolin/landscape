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

export interface ProjectProfile {
  project_id: number;
  project_name: string;
  project_number?: string;
  analysis_type?: string;
  property_subtype?: string;
  project_status?: string;
  target_units?: number;
  gross_acres?: number;
  address?: string;
  city?: string;
  county?: string;
  msa_id?: number;
  msa_name?: string; // Joined from tbl_msa
  state_abbreviation?: string; // Joined from tbl_msa
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
        p.target_units,
        p.acres_gross as gross_acres,
        COALESCE(p.street_address, p.project_address) as address,
        COALESCE(p.city, p.jurisdiction_city) as city,
        COALESCE(p.county, p.jurisdiction_county) as county,
        p.msa_id,
        m.msa_name,
        m.state_abbreviation,
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
      'analysis_type': 'analysis_type',
      'property_subtype': 'property_subtype',
      'target_units': 'target_units',
      'gross_acres': 'acres_gross',
      'address': 'street_address',
      'city': 'city',
      'county': 'county',
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
        p.target_units,
        p.acres_gross as gross_acres,
        COALESCE(p.street_address, p.project_address) as address,
        COALESCE(p.city, p.jurisdiction_city) as city,
        COALESCE(p.county, p.jurisdiction_county) as county,
        p.msa_id,
        m.msa_name,
        m.state_abbreviation,
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
