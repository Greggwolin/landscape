import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

import { requireAuth } from '@/lib/api/requireAuth';
export async function GET(request: NextRequest) {
  const __auth = await requireAuth(request);
  if (__auth instanceof NextResponse) return __auth;
  // TODO(LSCMD-AUTH-ROLLOUT-Phase3.5): scope query by __auth.userId

  try {
    // Check what columns exist in multifamily_unit
    const units = await sql`
      SELECT * FROM landscape.tbl_multifamily_unit WHERE project_id = 11 LIMIT 1
    `;

    const acquisitionData = await sql`
      SELECT * FROM landscape.tbl_property_acquisition WHERE project_id = 11 LIMIT 1
    `;

    return NextResponse.json({
      unitsSample: units[0] || null,
      acquisitionData: acquisitionData[0] || null,
      unitCount: units.length,
      success: true
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
      success: false
    }, { status: 500 });
  }
}
