import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * POST /api/projects/[projectId]/sale-phases/
 *
 * Create (or upsert) a sale phase and assign the originating parcel to it.
 * Direct-DB Next.js route matching the sibling sales endpoints' pattern; mirrors
 * Django apps/sales_absorption.create_sale_phase (+ assign_parcel_to_phase),
 * bridged to the classic-UI hook payload (useCreateSalePhase / CreateSalePhaseModal):
 *   { parcel_id, sale_phase_number, sale_date, onsite_cost_pct, commission_pct, closing_cost_per_unit }
 *
 * phase_code convention: `P{projectId}-{sale_phase_number}`. tbl_sale_phases.phase_code
 * is a GLOBAL primary key, so the project prefix keeps codes unique across projects and
 * matches the existing "P9-..." style already present in the data.
 *
 * Session: LSCMD-DUALUI-AUTH-0617-ec10
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const pid = parseInt(projectId);
    const body = await request.json();
    const {
      parcel_id,
      sale_phase_number,
      sale_date,
      onsite_cost_pct = null,
      commission_pct = null,
      closing_cost_per_unit = null,
    } = body;

    if (!pid || !sale_phase_number || !sale_date) {
      return NextResponse.json(
        { error: 'sale_phase_number and sale_date are required' },
        { status: 400 }
      );
    }

    const phaseCode = `P${pid}-${sale_phase_number}`;
    const phaseName = `Phase ${sale_phase_number}`;

    const phaseRows = await sql`
      INSERT INTO landscape.tbl_sale_phases
        (phase_code, project_id, phase_name, default_sale_date,
         default_commission_pct, default_closing_cost_per_unit, default_onsite_cost_pct)
      VALUES
        (${phaseCode}, ${pid}, ${phaseName}, ${sale_date},
         ${commission_pct}, ${closing_cost_per_unit}, ${onsite_cost_pct})
      ON CONFLICT (phase_code) DO UPDATE SET
        default_sale_date = EXCLUDED.default_sale_date,
        default_commission_pct = EXCLUDED.default_commission_pct,
        default_closing_cost_per_unit = EXCLUDED.default_closing_cost_per_unit,
        default_onsite_cost_pct = EXCLUDED.default_onsite_cost_pct,
        updated_at = NOW()
      RETURNING phase_code, project_id, phase_name, default_sale_date,
                default_commission_pct, default_closing_cost_per_unit, default_onsite_cost_pct
    `;

    // Assign the originating parcel to the new/updated phase (clears any custom override),
    // mirroring assign_parcel_to_phase so the parcel surfaces under the phase on refetch.
    if (parcel_id) {
      await sql`
        UPDATE landscape.tbl_parcel
        SET sale_phase_code = ${phaseCode},
            custom_sale_date = NULL,
            has_sale_overrides = FALSE
        WHERE project_id = ${pid} AND parcel_id = ${parcel_id}
      `;
    }

    return NextResponse.json(phaseRows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating sale phase:', error);
    return NextResponse.json({ error: 'Failed to create sale phase' }, { status: 500 });
  }
}
