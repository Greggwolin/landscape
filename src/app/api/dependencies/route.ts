/**
 * Dependencies API - List & Create
 * GET /api/dependencies?project_id={id} or ?item_type={type}&item_id={id}
 * POST /api/dependencies
 */

import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';

const sql = neon(process.env.DATABASE_URL!);

/**
 * GET /api/dependencies
 * Get dependencies filtered by project_id or specific item
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const itemType = searchParams.get('item_type');
    const itemId = searchParams.get('item_id');

    // Query by specific item (dependent item)
    if (itemId && itemType) {
      const result = await sql`
        SELECT
          d.*,
          CASE
            WHEN d.trigger_item_table='tbl_budget_items' THEN bi.description
            WHEN d.trigger_item_table='tbl_absorption_schedule' THEN ab.revenue_stream_name
            ELSE 'Unknown'
          END AS trigger_item_name,
          CASE
            WHEN d.dependent_item_table='tbl_budget_items' THEN bi_dep.description
            WHEN d.dependent_item_table='tbl_absorption_schedule' THEN ab_dep.revenue_stream_name
            ELSE 'Unknown'
          END AS dependent_item_name
        FROM landscape.tbl_item_dependency d
        LEFT JOIN landscape.tbl_budget_items bi
          ON d.trigger_item_table='tbl_budget_items' AND d.trigger_item_id=bi.budget_item_id
        LEFT JOIN landscape.tbl_absorption_schedule ab
          ON d.trigger_item_table='tbl_absorption_schedule' AND d.trigger_item_id=ab.absorption_id
        LEFT JOIN landscape.tbl_budget_items bi_dep
          ON d.dependent_item_table='tbl_budget_items' AND d.dependent_item_id=bi_dep.budget_item_id
        LEFT JOIN landscape.tbl_absorption_schedule ab_dep
          ON d.dependent_item_table='tbl_absorption_schedule' AND d.dependent_item_id=ab_dep.absorption_id
        WHERE d.dependent_item_type=${itemType}
        AND d.dependent_item_id=${itemId}
        ORDER BY d.created_at
      `;

      return NextResponse.json({
        success: true,
        data: result,
        count: result.length,
      });
    }

    // Query by project_id (budget items only)
    if (projectId) {
      const result = await sql`
        SELECT
          d.*,
          bi_dep.description AS dependent_item_name,
          bi_trig.description AS trigger_item_name,
          bi_dep.project_id
        FROM landscape.tbl_item_dependency d
        LEFT JOIN landscape.tbl_budget_items bi_dep
          ON d.dependent_item_table='tbl_budget_items'
          AND d.dependent_item_id=bi_dep.budget_item_id
        LEFT JOIN landscape.tbl_budget_items bi_trig
          ON d.trigger_item_table='tbl_budget_items'
          AND d.trigger_item_id=bi_trig.budget_item_id
        WHERE bi_dep.project_id=${projectId}
        ORDER BY d.created_at
      `;

      return NextResponse.json({
        success: true,
        data: result,
        count: result.length,
      });
    }

    // Missing parameters
    return NextResponse.json(
      {
        success: false,
        error: 'Missing required parameters: project_id or (item_type + item_id)',
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Dependencies GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch dependencies',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dependencies
 * Create a new dependency
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      dependent_item_type,
      dependent_item_table,
      dependent_item_id,
      trigger_item_type,
      trigger_item_table,
      trigger_item_id,
      trigger_event,
      trigger_value,
      offset_periods,
      is_hard_dependency,
      notes,
    } = body;

    // Validation
    if (!dependent_item_type || !dependent_item_id || !trigger_event) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: dependent_item_type, dependent_item_id, trigger_event',
        },
        { status: 400 }
      );
    }

    // Prevent self-dependency
    if (
      trigger_item_type === dependent_item_type &&
      trigger_item_id === dependent_item_id
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot create dependency: item cannot depend on itself',
        },
        { status: 400 }
      );
    }

    // Insert dependency
    const result = await sql`
      INSERT INTO landscape.tbl_item_dependency (
        dependent_item_type,
        dependent_item_table,
        dependent_item_id,
        trigger_item_type,
        trigger_item_table,
        trigger_item_id,
        trigger_event,
        trigger_value,
        offset_periods,
        is_hard_dependency,
        notes
      ) VALUES (
        ${dependent_item_type},
        ${dependent_item_table},
        ${dependent_item_id},
        ${trigger_item_type || null},
        ${trigger_item_table || null},
        ${trigger_item_id || null},
        ${trigger_event},
        ${trigger_value || null},
        ${offset_periods || 0},
        ${is_hard_dependency || false},
        ${notes || null}
      ) RETURNING *
    `;

    // Update dependent item timing method to DEPENDENT
    if (dependent_item_table === 'tbl_budget_items') {
      await sql`
        UPDATE landscape.tbl_budget_items
        SET timing_method='DEPENDENT'
        WHERE budget_item_id=${dependent_item_id}
      `;
    } else if (dependent_item_table === 'tbl_absorption_schedule') {
      await sql`
        UPDATE landscape.tbl_absorption_schedule
        SET timing_method='DEPENDENT'
        WHERE absorption_id=${dependent_item_id}
      `;
    }

    return NextResponse.json({
      success: true,
      data: result[0],
      message: 'Dependency created successfully',
    });
  } catch (error: any) {
    console.error('Dependencies POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create dependency',
      },
      { status: 500 }
    );
  }
}
