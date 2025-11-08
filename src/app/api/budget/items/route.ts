import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/budget/items
 *
 * Create a new budget line item
 *
 * Request Body (Option 1 - New container-based):
 * {
 *   budgetId: number,
 *   projectId: number,
 *   containerId?: number (null for project-level),
 *   categoryId: number, // Legacy field (for backward compatibility)
 *   categoryL1Id?: number, // New hierarchy fields
 *   categoryL2Id?: number,
 *   categoryL3Id?: number,
 *   categoryL4Id?: number,
 *   uomCode?: string (default: "EA"),
 *   qty?: number,
 *   rate?: number,
 *   amount?: number (auto-calculated from qty * rate if not provided),
 *   startDate?: string (ISO date),
 *   endDate?: string (ISO date),
 *   escalationRate?: number,
 *   contingencyPct?: number,
 *   timingMethod?: string (default: "distributed"),
 *   notes?: string
 * }
 *
 * Legacy pe_level inputs are accepted for backward compatibility but are only used to
 * resolve the appropriate container/project identifiers.
 *
 * Returns:
 * - item: BudgetGridItem - The newly created budget item with all calculated fields
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      budgetId,
      // New container-based approach
      containerId,
      // Legacy pe_level approach (still supported)
      peLevel,
      peId,
      projectId: projectIdInput,
      // Common fields
      categoryId, // Legacy field
      categoryL1Id, // New hierarchy fields
      categoryL2Id,
      categoryL3Id,
      categoryL4Id,
      uomCode = 'EA',
      qty,
      rate,
      amount,
      startDate,
      endDate,
      startPeriod,
      periods,
      vendorName,
      escalationRate = 0,
      contingencyPct = 0,
      timingMethod = 'distributed',
      notes = ''
    } = body;

    // Validate required fields - now more flexible
    // Either legacy categoryId OR at least one category hierarchy field is required
    if (!budgetId || (!categoryId && !categoryL1Id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          details: 'budgetId and either categoryId or categoryL1Id is required'
        },
        { status: 400 }
      );
    }

    // Validate amount OR (qty + rate)
    if (!amount && (!qty || !rate)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input',
          details: 'Must provide either amount OR both qty and rate'
        },
        { status: 400 }
      );
    }

    let projectId =
      typeof projectIdInput === 'number' && Number.isFinite(projectIdInput)
        ? projectIdInput
        : null;

    let resolvedContainerId =
      typeof containerId === 'number' && Number.isFinite(containerId)
        ? containerId
        : null;

    if (!resolvedContainerId && peLevel && peId && peLevel !== 'project') {
      const column =
        peLevel === 'area'
          ? 'area_id'
          : peLevel === 'phase'
            ? 'phase_id'
            : 'parcel_id';
      const [containerRow] =
        peLevel === 'project'
          ? []
          : await sql`
              SELECT container_id, project_id
              FROM landscape.tbl_container
              WHERE container_level = ${
                peLevel === 'area' ? 1 : peLevel === 'phase' ? 2 : 3
              }
                AND attributes->>${column} = ${peId}
              LIMIT 1
            `;
      if (containerRow?.container_id != null) {
        resolvedContainerId = Number(containerRow.container_id);
        if (projectId == null && containerRow.project_id != null) {
          projectId = Number(containerRow.project_id);
        }
      }
    }

    if (resolvedContainerId != null && projectId == null) {
      const [row] = await sql`
        SELECT project_id FROM landscape.tbl_container WHERE container_id = ${resolvedContainerId}
      `;
      if (row?.project_id != null) {
        projectId = Number(row.project_id);
      }
    }

    if (projectId == null && peLevel === 'project' && peId) {
      const numericPe = Number(peId);
      if (Number.isFinite(numericPe)) {
        projectId = numericPe;
      }
    }

    if (projectId == null) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing project context',
          details: 'projectId is required when creating budget items'
        },
        { status: 400 }
      );
    }

    // Calculate amount if not provided
    const finalAmount = amount || (qty * rate);

    // Insert the new budget item
    // Hierarchy is now determined by project/container identifiers only
    const result = await sql`
      INSERT INTO landscape.core_fin_fact_budget (
        budget_id,
        container_id,
        project_id,
        category_id,
        category_l1_id,
        category_l2_id,
        category_l3_id,
        category_l4_id,
        uom_code,
        qty,
        rate,
        amount,
        start_date,
        end_date,
        start_period,
        periods,
        vendor_name,
        escalation_rate,
        contingency_pct,
        timing_method,
        notes,
        created_at
      ) VALUES (
        ${budgetId},
        ${resolvedContainerId},
        ${projectId},
        ${categoryId || null},
        ${categoryL1Id || null},
        ${categoryL2Id || null},
        ${categoryL3Id || null},
        ${categoryL4Id || null},
        ${uomCode},
        ${qty || null},
        ${rate || null},
        ${finalAmount},
        ${startDate || null},
        ${endDate || null},
        ${startPeriod || null},
        ${periods || null},
        ${vendorName || null},
        ${escalationRate},
        ${contingencyPct},
        ${timingMethod},
        ${notes},
        NOW()
      )
      RETURNING *
    `;

    const newItem = result[0];

    // Fetch the complete item with category hierarchy and breadcrumb
    const enrichedItem = await sql`
      SELECT
        vbgi.*,
        parent_cat.detail as parent_category_name,
        parent_cat.code as parent_category_code,
        -- Build category breadcrumb from L1 → L2 → L3 → L4
        CONCAT_WS(' → ',
          NULLIF(l1.name, ''),
          NULLIF(l2.name, ''),
          NULLIF(l3.name, ''),
          NULLIF(l4.name, '')
        ) as category_breadcrumb
      FROM landscape.vw_budget_grid_items vbgi
      LEFT JOIN landscape.core_fin_category parent_cat ON parent_cat.category_id = (
        SELECT parent_id FROM landscape.core_fin_category WHERE category_id = vbgi.category_id
      )
      LEFT JOIN landscape.core_budget_category l1 ON l1.category_id = vbgi.category_l1_id
      LEFT JOIN landscape.core_budget_category l2 ON l2.category_id = vbgi.category_l2_id
      LEFT JOIN landscape.core_budget_category l3 ON l3.category_id = vbgi.category_l3_id
      LEFT JOIN landscape.core_budget_category l4 ON l4.category_id = vbgi.category_l4_id
      WHERE vbgi.fact_id = ${newItem.fact_id}
    `;

    return NextResponse.json({
      success: true,
      data: {
        item: enrichedItem[0]
      }
    });

  } catch (error) {
    console.error('Error creating budget item:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create budget item',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
