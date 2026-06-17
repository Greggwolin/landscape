import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * PATCH /api/projects/[projectId]/parcel-sale-phase/
 *
 * Assign (or clear) a parcel's sale phase. Direct-DB Next.js route mirroring
 * Django apps/sales_absorption.assign_parcel_to_phase, bridged to the hook payload
 * (useAssignParcelToPhase): { parcel_id, sale_phase_code }. A null sale_phase_code
 * clears the assignment.
 *
 * Session: LSCMD-DUALUI-AUTH-0617-ec10
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const pid = parseInt(projectId);
    const { parcel_id, sale_phase_code } = await request.json();

    if (!pid || !parcel_id) {
      return NextResponse.json({ error: 'parcel_id is required' }, { status: 400 });
    }

    const rows = await sql`
      UPDATE landscape.tbl_parcel
      SET sale_phase_code = ${sale_phase_code ?? null},
          custom_sale_date = NULL,
          has_sale_overrides = FALSE
      WHERE project_id = ${pid} AND parcel_id = ${parcel_id}
      RETURNING parcel_id, sale_phase_code
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Parcel not found' }, { status: 404 });
    }

    return NextResponse.json({ updated_count: rows.length, parcel: rows[0] });
  } catch (error) {
    console.error('Error assigning parcel to phase:', error);
    return NextResponse.json({ error: 'Failed to update sale phase' }, { status: 500 });
  }
}
