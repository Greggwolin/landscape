import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * GET /api/landuse/codes
 * Returns all land use codes with their family and subtype relationships
 */
export async function GET() {
  try {
    // Return all land use codes from tbl_landuse
    const codes = await sql`
      SELECT
        landuse_id,
        landuse_code,
        name
      FROM landscape.tbl_landuse
      ORDER BY landuse_code
    `;

    // Map to expected format for ParcelDetailCard component
    const mappedCodes = codes.map(code => ({
      landuse_id: code.landuse_id,
      landuse_code: code.landuse_code,
      name: code.name,
      family_id: '', // Not available in tbl_landuse
      subtype_id: '', // Not available in tbl_landuse
      has_zoning: false,
      has_programming: false
    }));

    return NextResponse.json(mappedCodes);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Land use codes API error:', error);
    return NextResponse.json({
      error: 'Failed to fetch land use codes',
      details: message
    }, { status: 500 });
  }
}
