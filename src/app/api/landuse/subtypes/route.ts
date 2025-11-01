import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * GET /api/landuse/subtypes
 * Returns all land use subtypes with their family relationships
 */
export async function GET() {
  try {
    const subtypes = await sql`
      SELECT
        subtype_id,
        family_id,
        code,
        name,
        ord,
        active
      FROM landscape.lu_subtype
      WHERE active = true
      ORDER BY family_id, ord, name
    `;

    return NextResponse.json(subtypes);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Land use subtypes API error:', error);
    return NextResponse.json({
      error: 'Failed to fetch land use subtypes',
      details: message
    }, { status: 500 });
  }
}
