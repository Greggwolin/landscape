 
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * GET /api/capitalization/summary
 * Get high-level capitalization metrics for a project
 *
 * Query params:
 * - projectId (required): The project ID
 *
 * Calculates:
 * - Total capitalization (debt + equity)
 * - Total debt, total equity
 * - Leverage ratio
 * - Weighted average interest rate
 * - Blended LTV
 * - Counts of facilities, partners, waterfall tiers
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    const projectIdNum = parseInt(projectId);

    // 1. Get debt facilities summary
    const debtSummary = await sql`
      SELECT
        COUNT(*) as facility_count,
        COALESCE(SUM(commitment_amount), 0) as total_debt,
        COALESCE(SUM(commitment_amount * interest_rate) / NULLIF(SUM(commitment_amount), 0), 0) as weighted_avg_rate,
        AVG((covenants->>'ltv_pct')::numeric) as avg_ltv
      FROM landscape.tbl_debt_facility
      WHERE project_id = ${projectIdNum}
    `;

    const totalDebt = Number(debtSummary[0]?.total_debt || 0);
    const debtFacilitiesCount = Number(debtSummary[0]?.facility_count || 0);
    const weightedAvgInterestRate = Number(debtSummary[0]?.weighted_avg_rate || 0) * 100; // Convert to percentage
    const blendedLtv = Number(debtSummary[0]?.avg_ltv || 0);

    // 2. Get equity partners summary
    const equitySummary = await sql`
      SELECT
        COUNT(*) as partner_count,
        COALESCE(SUM(committed_capital), 0) as total_equity
      FROM landscape.tbl_equity_partner
      WHERE project_id = ${projectIdNum}
    `;

    const totalEquity = Number(equitySummary[0]?.total_equity || 0);
    const equityTranchesCount = Number(equitySummary[0]?.partner_count || 0);

    // 3. Get equity structure (for preferred return and GP promote)
    const equityStructure = await sql`
      SELECT
        preferred_return_pct,
        gp_promote_after_pref
      FROM landscape.tbl_equity_structure
      WHERE project_id = ${projectIdNum}
      ORDER BY equity_structure_id DESC
      LIMIT 1
    `;

    const preferredReturnPct = equityStructure.length > 0
      ? Number(equityStructure[0].preferred_return_pct) // Already a percentage in DB (8.000)
      : 0;
    const gpPromotePct = equityStructure.length > 0
      ? Number(equityStructure[0].gp_promote_after_pref) // Already a percentage in DB (20.00)
      : 0;

    // 4. Get waterfall tiers count
    const waterfallCount = await sql`
      SELECT COUNT(*) as tier_count
      FROM landscape.tbl_waterfall_tier wt
      JOIN landscape.tbl_equity_structure es ON wt.equity_structure_id = es.equity_structure_id
      WHERE es.project_id = ${projectIdNum}
    `;

    const waterfallTiersCount = Number(waterfallCount[0]?.tier_count || 0);
    const waterfallActiveTiersCount = waterfallTiersCount; // All active since no is_active field

    // 5. Calculate summary metrics
    const totalCapitalization = totalDebt + totalEquity;
    const leverageRatioPct = totalCapitalization > 0
      ? (totalDebt / totalCapitalization) * 100
      : 0;

    // Build response
    const summary = {
      project_id: projectIdNum,

      // Capitalization totals
      total_capitalization: totalCapitalization,
      total_debt: totalDebt,
      total_equity: totalEquity,
      leverage_ratio_pct: Number(leverageRatioPct.toFixed(2)),

      // Counts
      debt_facilities_count: debtFacilitiesCount,
      equity_tranches_count: equityTranchesCount,
      waterfall_tiers_count: waterfallTiersCount,
      waterfall_active_tiers_count: waterfallActiveTiersCount,

      // Debt metrics
      weighted_avg_interest_rate: Number(weightedAvgInterestRate.toFixed(3)),
      blended_ltv: Number(blendedLtv.toFixed(2)),

      // Equity metrics
      preferred_return_pct: Number(preferredReturnPct.toFixed(2)),
      gp_promote_pct: Number(gpPromotePct.toFixed(2)),
    };

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Error fetching capitalization summary:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch capitalization summary' },
      { status: 500 }
    );
  }
}
