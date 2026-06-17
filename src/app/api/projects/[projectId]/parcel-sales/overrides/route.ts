import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * PATCH /api/projects/[projectId]/parcel-sales/overrides/
 *
 * Save parcel-level sale-cost overrides. Direct-DB Next.js route mirroring
 * Django apps/sales_absorption.save_parcel_overrides: marks the parcel
 * has_sale_overrides=TRUE and upserts the per-parcel settlement row (one per
 * parcel). Hook payload (useSaveParcelOverrides):
 *   { parcel_id, onsite_cost_pct?, commission_pct?, closing_cost_per_unit?, ... }
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
    const body = await request.json();
    const {
      parcel_id,
      onsite_cost_pct = null,
      commission_pct = null,
      closing_cost_per_unit = null,
    } = body;

    if (!pid || !parcel_id) {
      return NextResponse.json({ error: 'parcel_id is required' }, { status: 400 });
    }

    await sql`
      UPDATE landscape.tbl_parcel
      SET has_sale_overrides = TRUE
      WHERE project_id = ${pid} AND parcel_id = ${parcel_id}
    `;

    // One settlement row per parcel: update if present, otherwise insert.
    const existing = await sql`
      SELECT settlement_id FROM landscape.tbl_sale_settlement
      WHERE parcel_id = ${parcel_id}
      ORDER BY settlement_id ASC
      LIMIT 1
    `;

    let row;
    if (existing.length > 0) {
      const updated = await sql`
        UPDATE landscape.tbl_sale_settlement
        SET commission_pct = ${commission_pct},
            closing_cost_per_unit = ${closing_cost_per_unit},
            onsite_cost_pct = ${onsite_cost_pct},
            updated_at = NOW()
        WHERE settlement_id = ${existing[0].settlement_id}
        RETURNING settlement_id, commission_pct, closing_cost_per_unit, onsite_cost_pct
      `;
      row = updated[0];
    } else {
      const inserted = await sql`
        INSERT INTO landscape.tbl_sale_settlement
          (project_id, parcel_id, commission_pct, closing_cost_per_unit, onsite_cost_pct, sale_date)
        VALUES (${pid}, ${parcel_id}, ${commission_pct}, ${closing_cost_per_unit}, ${onsite_cost_pct}, CURRENT_DATE)
        RETURNING settlement_id, commission_pct, closing_cost_per_unit, onsite_cost_pct
      `;
      row = inserted[0];
    }

    return NextResponse.json({ parcel_id, ...row });
  } catch (error) {
    console.error('Error saving parcel overrides:', error);
    return NextResponse.json({ error: 'Failed to save parcel overrides' }, { status: 500 });
  }
}
