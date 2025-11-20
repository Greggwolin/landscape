/**
 * GET /api/measures
 *
 * Returns units of measure for UOM dropdown in budget grid
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const systemOnly = searchParams.get('systemOnly') === 'true';

    const query = `
      SELECT
        measure_code AS code,
        measure_name AS name,
        measure_category AS category,
        is_system
      FROM landscape.tbl_measures
      ${systemOnly ? 'WHERE is_system = true' : ''}
      ORDER BY measure_name
    `;

    const rows = await sql.query<{
      code: string;
      name: string;
      category: string | null;
      is_system: boolean | null;
    }>(query);

    // Map to expected format
    const measures = rows.map((row) => ({
      code: row.code,
      label: row.name ? `${row.code} - ${row.name}` : row.code,
      name: row.name,
      type: row.category ?? null,
      is_system: row.is_system ?? false
    }));

    return NextResponse.json(measures);
  } catch (error) {
    console.error('Error fetching measures:', error);
    return NextResponse.json(
      { error: 'Failed to fetch measures', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
