/**
 * GET /api/budget/curve-profiles
 *
 * Fetch available S-curve profiles for dropdown selection.
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const rows = await sql<{
      curveId: number;
      curveName: string;
      curveCode: string;
      description: string | null;
      deciles: (string | number)[];
      isSystem: boolean | null;
    }>`
      SELECT
        curve_id AS "curveId",
        curve_name AS "curveName",
        curve_code AS "curveCode",
        description,
        ARRAY[
          pct_at_10, pct_at_20, pct_at_30, pct_at_40, pct_at_50,
          pct_at_60, pct_at_70, pct_at_80, pct_at_90, pct_at_100
        ] AS deciles,
        is_system AS "isSystem"
      FROM landscape.core_fin_curve_profile
      WHERE is_active = TRUE
      ORDER BY
        CASE curve_code
          WHEN 'S' THEN 1
          WHEN 'S1' THEN 2
          WHEN 'S2' THEN 3
          WHEN 'S3' THEN 4
          WHEN 'S4' THEN 5
          ELSE 99
        END,
        curve_name
    `;

    const profiles = rows.map(row => ({
      ...row,
      deciles: row.deciles.map(value => Number(value))
    }));

    return NextResponse.json({
      success: true,
      profiles
    });
  } catch (error) {
    console.error('Error fetching curve profiles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch curve profiles' },
      { status: 500 }
    );
  }
}
