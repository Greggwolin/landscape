import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/budget/items/:projectId
 *
 * Fetch budget items for a project with optional filtering
 *
 * Query Parameters:
 * - scope?: string - Filter by budget scope (e.g., "Acquisition", "Stage 1")
 * - version?: string - Filter by budget version (e.g., "Original", "Forecast")
 * - includeVariance?: boolean - Include variance calculations (default: true)
 *
 * Returns:
 * - items: BudgetGridItem[] - Array of budget line items with full hierarchy
 * - summary: { totalAmount, itemCount, scopes } - Aggregated summary
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const { projectId } = await params;
    const numericProjectId = Number(projectId);
    if (!Number.isFinite(numericProjectId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid projectId', details: 'projectId must be numeric' },
        { status: 400 }
      );
    }
    const scopeFilter = searchParams.get('scope');
    const versionFilter = searchParams.get('version'); // No default - show all versions if not specified
    const includeVariance = searchParams.get('includeVariance') !== 'false';

    // Fetch budget items using the view
    let items;

    if (includeVariance) {
      items = await sql`
        SELECT
          vbgi.*,
          vbv.original_amount,
          vbv.variance_amount,
          vbv.variance_percent,
          vbv.variance_status,
          uc.category_name,
          uc.parent_id as category_parent_id
        FROM landscape.vw_budget_grid_items vbgi
        LEFT JOIN landscape.vw_budget_variance vbv ON vbgi.fact_id = vbv.fact_id
        LEFT JOIN landscape.core_unit_cost_category uc ON uc.category_id = vbgi.category_id
        WHERE vbgi.project_id = ${numericProjectId}
          AND (${scopeFilter}::text IS NULL OR vbgi.scope = ${scopeFilter})
          AND (${versionFilter}::text IS NULL OR vbgi.budget_version = ${versionFilter})
        ORDER BY
          vbgi.scope,
          vbgi.category_depth,
          vbgi.cost_code,
          vbgi.fact_id
      `;
    } else {
      items = await sql`
        SELECT
          vbgi.*,
          uc.category_name,
          uc.parent_id as category_parent_id
        FROM landscape.vw_budget_grid_items vbgi
        LEFT JOIN landscape.core_unit_cost_category uc ON uc.category_id = vbgi.category_id
        WHERE vbgi.project_id = ${numericProjectId}
          AND (${scopeFilter}::text IS NULL OR vbgi.scope = ${scopeFilter})
          AND (${versionFilter}::text IS NULL OR vbgi.budget_version = ${versionFilter})
        ORDER BY
          vbgi.scope,
          vbgi.category_depth,
          vbgi.cost_code,
          vbgi.fact_id
      `;
    }

    // Calculate summary
    const summary = {
      totalAmount: items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
      itemCount: items.length,
      scopes: [...new Set(items.map(item => item.scope))],
      budgetVersion: versionFilter || 'All Versions',
      budgetVersions: [...new Set(items.map(item => item.budget_version))]
    };

    // Group items by scope for hierarchical display
    const scopeGroups = items.reduce((groups, item) => {
      const scope = item.scope || 'Other';
      if (!groups[scope]) {
        groups[scope] = [];
      }
      groups[scope].push(item);
      return groups;
    }, {} as Record<string, typeof items>);

    return NextResponse.json({
      success: true,
      data: {
        items,
        scopeGroups,
        summary
      }
    });

  } catch (error) {
    console.error('Error fetching budget items:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch budget items',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
