import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type Params = {
  projectId: string;
};

/**
 * GET /api/projects/[projectId]/assumptions/base
 *
 * Phase 4: Fetch Base Assumptions from Project Data
 *
 * Calculates base assumptions dynamically from:
 * - Parcel sales data (pricing, absorption)
 * - Budget totals (development costs)
 * - Operating expenses
 * - Project timeline
 *
 * Per user clarification: Option C - Calculate dynamically, don't create new table
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { projectId } = await params;
  const id = Number(projectId);

  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }

  try {
    // Fetch parcel sales data for pricing and units
    const salesData = await sql<any[]>`
      SELECT
        COUNT(*)::int AS units_sold,
        AVG(current_value_per_unit)::numeric AS avg_price_per_unit,
        COUNT(*) FILTER (WHERE sale_date IS NOT NULL)::numeric AS sales_with_dates
      FROM landscape.tbl_parcel
      WHERE project_id = ${id}
        AND current_value_per_unit > 0
    `;

    // Fetch budget totals for development cost
    const budgetData = await sql<any[]>`
      SELECT
        SUM(amount)::numeric AS total_development_cost
      FROM landscape.core_fin_fact_budget b
      JOIN landscape.tbl_container c ON c.division_id = b.division_id
      WHERE c.project_id = ${id}
    `;

    // Fetch operating expenses
    const opexData = await sql<any[]>`
      SELECT
        SUM(monthly_amount * 12)::numeric AS annual_opex
      FROM landscape.tbl_operating_expenses
      WHERE project_id = ${id}
    `;

    // Calculate absorption rate (simplified: assume 12-month sellout if no data)
    const unitsSold = Number(salesData[0]?.units_sold || 100);
    const monthlyAbsorption = unitsSold / 12; // Default 12-month sellout

    // Construct base assumptions object
    const baseAssumptions = {
      units_sold: unitsSold,
      price_per_unit: Number(salesData[0]?.avg_price_per_unit || 500000),
      absorption_rate: Number(monthlyAbsorption.toFixed(2)),
      development_cost: Number(budgetData[0]?.total_development_cost || 0),
      operating_expenses: Number(opexData[0]?.annual_opex || 0),
      discount_rate: 0.10, // Default 10% discount rate
    };

    return NextResponse.json(baseAssumptions);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to fetch base assumptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch base assumptions', details: message },
      { status: 500 }
    );
  }
}
