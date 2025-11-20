import { NextResponse } from 'next/server';
import { sql } from '../../../../../lib/db';

type Params = { params: Promise<{ projectId: string }> };

/**
 * GET /api/projects/:projectId/granularity
 *
 * Returns project data granularity/completeness indicators.
 * Calculates completeness scores for budget, sales, and planning data.
 *
 * Response:
 *   {
 *     budget_completeness: number (0-100),
 *     sales_completeness: number (0-100),
 *     planning_completeness: number (0-100),
 *     overall_score: number (0-100)
 *   }
 */
export async function GET(
  request: Request,
  context: Params
) {
  try {
    const projectId = parseInt((await context.params).projectId);

    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    // Calculate budget completeness
    // Based on: number of line items, categories used, fields filled
    const budgetData = await sql`
      SELECT
        COUNT(DISTINCT f.fact_id) as line_item_count,
        COUNT(DISTINCT f.category_id) as categories_used,
        COUNT(*) FILTER (WHERE f.description IS NOT NULL AND f.description != '') as with_description,
        COUNT(*) FILTER (WHERE f.amount > 0) as with_amount,
        COUNT(*) FILTER (WHERE f.phase_id IS NOT NULL) as with_phase,
        COUNT(*) as total_facts
      FROM landscape.core_fin_budget_version b
      LEFT JOIN landscape.core_fin_fact_budget f ON f.budget_id = b.budget_id
      WHERE b.project_id = ${projectId}
      AND b.status = 'active'
    `;

    const budgetStats = budgetData[0] || {};
    const totalBudgetFacts = Number(budgetStats.total_facts) || 0;
    const budgetCompleteness = totalBudgetFacts > 0
      ? Math.min(100, Math.round(
          ((Number(budgetStats.with_description) / totalBudgetFacts) * 30) +
          ((Number(budgetStats.with_amount) / totalBudgetFacts) * 40) +
          ((Number(budgetStats.with_phase) / totalBudgetFacts) * 30)
        ))
      : 0;

    // Calculate sales completeness
    // Based on: parcels with sales data, pricing assumptions, absorption rates
    const salesData = await sql`
      SELECT
        COUNT(DISTINCT p.parcel_id) as total_parcels,
        COUNT(DISTINCT s.parcel_id) as parcels_with_sales,
        COUNT(DISTINCT pa.id) as pricing_assumptions_count
      FROM landscape.tbl_parcel p
      LEFT JOIN landscape.tbl_parcel_sales s ON s.parcel_id = p.parcel_id
      LEFT JOIN landscape.tbl_pricing_assumption pa ON pa.project_id = p.project_id
      WHERE p.project_id = ${projectId}
    `;

    const salesStats = salesData[0] || {};
    const totalParcels = Number(salesStats.total_parcels) || 0;
    const salesCompleteness = totalParcels > 0
      ? Math.min(100, Math.round(
          ((Number(salesStats.parcels_with_sales) / totalParcels) * 70) +
          (Math.min(Number(salesStats.pricing_assumptions_count), 5) / 5 * 30)
        ))
      : 0;

    // Calculate planning completeness
    // Based on: containers defined, product types, land use assignments
    const planningData = await sql`
      SELECT
        COUNT(DISTINCT c.container_id) as container_count,
        COUNT(DISTINCT p.parcel_id) as parcels_count,
        COUNT(DISTINCT p.type_code) as product_types_count,
        COUNT(*) FILTER (WHERE p.type_code IS NOT NULL) as parcels_with_types
      FROM landscape.tbl_container c
      LEFT JOIN landscape.tbl_parcel p ON p.project_id = c.project_id
      WHERE c.project_id = ${projectId}
    `;

    const planningStats = planningData[0] || {};
    const totalPlanningParcels = Number(planningStats.parcels_count) || 0;
    const planningCompleteness = totalPlanningParcels > 0
      ? Math.min(100, Math.round(
          (Math.min(Number(planningStats.container_count), 10) / 10 * 40) +
          ((Number(planningStats.parcels_with_types) / totalPlanningParcels) * 60)
        ))
      : 0;

    // Calculate overall score (weighted average)
    const overall_score = Math.round(
      (budgetCompleteness * 0.4) +
      (salesCompleteness * 0.3) +
      (planningCompleteness * 0.3)
    );

    const granularity = {
      budget_completeness: budgetCompleteness,
      sales_completeness: salesCompleteness,
      planning_completeness: planningCompleteness,
      overall_score: overall_score,
    };

    return NextResponse.json(granularity);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Project granularity API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project granularity', details: message },
      { status: 500 }
    );
  }
}
