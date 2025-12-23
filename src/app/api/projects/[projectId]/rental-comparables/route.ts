/**
 * Rental Comparables API
 * GET /api/projects/[projectId]/rental-comparables
 *
 * Returns rental comparable properties for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type Params = { params: Promise<{ projectId: string }> };

export async function GET(
  request: NextRequest,
  context: Params
) {
  const { projectId } = await context.params;

  try {
    const result = await sql`
      SELECT
        comparable_id,
        property_name,
        address,
        latitude,
        longitude,
        distance_miles,
        year_built,
        total_units,
        unit_type,
        bedrooms,
        bathrooms,
        avg_sqft,
        asking_rent,
        effective_rent,
        concessions,
        amenities,
        notes,
        data_source,
        as_of_date,
        is_active
      FROM landscape.tbl_rental_comparable
      WHERE project_id = ${projectId}
        AND is_active = true
      ORDER BY distance_miles ASC, property_name ASC
    `;

    return NextResponse.json({
      success: true,
      data: result,
      count: result.length
    });
  } catch (error) {
    console.error('Rental comparables GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch rental comparables'
      },
      { status: 500 }
    );
  }
}
