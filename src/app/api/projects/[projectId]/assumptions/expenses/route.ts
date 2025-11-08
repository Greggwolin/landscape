import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type Params = { params: Promise<{ projectId: string }> };

// GET /api/projects/:projectId/assumptions/expenses
export async function GET(
  request: NextRequest,
  context: Params
) {
  try {
    const projectId = parseInt((await context.params).projectId);

    const [opexData, capexData] = await Promise.all([
      sql`SELECT * FROM landscape.tbl_operating_expense WHERE project_id = ${projectId} AND expense_category IS NULL LIMIT 1`,
      sql`SELECT * FROM landscape.tbl_capex_reserve WHERE project_id = ${projectId} LIMIT 1`
    ]);

    return NextResponse.json({
      operating_expense: opexData.rows[0] || null,
      capex: capexData.rows[0] || null
    });

  } catch (error) {
    console.error('Error fetching expense assumptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expense assumptions' },
      { status: 500 }
    );
  }
}

// POST /api/projects/:projectId/assumptions/expenses
export async function POST(
  request: NextRequest,
  context: Params
) {
  try {
    const projectId = parseInt((await context.params).projectId);
    const data = await request.json();

    const results: Record<string, unknown> = {};

    // Handle capex data (using existing table)
    if (data.capex) {
      const existingCapex = await sql`
        SELECT capex_id FROM landscape.tbl_capex_reserve WHERE project_id = ${projectId}
      `;

      if (existingCapex.rows.length > 0) {
        const result = await sql`
          UPDATE landscape.tbl_capex_reserve
          SET
            capex_per_unit_annual = ${data.capex.capex_per_unit_annual},
            immediate_capex = ${data.capex.immediate_capex},
            roof_reserve_per_unit = ${data.capex.roof_reserve_per_unit},
            hvac_reserve_per_unit = ${data.capex.hvac_reserve_per_unit},
            appliance_reserve_per_unit = ${data.capex.appliance_reserve_per_unit},
            other_reserve_per_unit = ${data.capex.other_reserve_per_unit},
            updated_at = NOW()
          WHERE project_id = ${projectId}
          RETURNING *
        `;
        results.capex = result.rows[0];
      } else {
        const result = await sql`
          INSERT INTO landscape.tbl_capex_reserve (
            project_id, capex_per_unit_annual, immediate_capex,
            roof_reserve_per_unit, hvac_reserve_per_unit, appliance_reserve_per_unit,
            other_reserve_per_unit
          ) VALUES (
            ${projectId}, ${data.capex.capex_per_unit_annual}, ${data.capex.immediate_capex},
            ${data.capex.roof_reserve_per_unit}, ${data.capex.hvac_reserve_per_unit},
            ${data.capex.appliance_reserve_per_unit}, ${data.capex.other_reserve_per_unit}
          )
          RETURNING *
        `;
        results.capex = result.rows[0];
      }
    }

    return NextResponse.json(results);

  } catch (error) {
    console.error('Error saving expense assumptions:', error);
    return NextResponse.json(
      { error: 'Failed to save expense assumptions' },
      { status: 500 }
    );
  }
}
