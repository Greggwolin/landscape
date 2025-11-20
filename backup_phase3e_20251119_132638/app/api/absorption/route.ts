/**
 * Absorption Schedule API - List & Create
 * GET /api/absorption?project_id={id}
 * POST /api/absorption
 */

import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';

const sql = neon(process.env.DATABASE_URL!);

/**
 * GET /api/absorption
 * List absorption schedules for a project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const phaseId = searchParams.get('phase_id');
    const parcelId = searchParams.get('parcel_id');

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: project_id',
        },
        { status: 400 }
      );
    }

    let result;

    if (parcelId) {
      // Get absorption schedules for a specific parcel
      result = await sql`
        SELECT
          ab.*,
          p.project_name,
          ph.phase_name,
          pa.parcel_code
        FROM landscape.tbl_absorption_schedule ab
        LEFT JOIN landscape.tbl_project p ON ab.project_id = p.project_id
        LEFT JOIN landscape.tbl_phase ph ON ab.phase_id = ph.phase_id
        LEFT JOIN landscape.tbl_parcel pa ON ab.parcel_id = pa.parcel_id
        WHERE ab.parcel_id=${parcelId}
        ORDER BY ab.start_period, ab.revenue_stream_name
      `;
    } else if (phaseId) {
      // Get absorption schedules for a specific phase
      result = await sql`
        SELECT
          ab.*,
          p.project_name,
          ph.phase_name
        FROM landscape.tbl_absorption_schedule ab
        LEFT JOIN landscape.tbl_project p ON ab.project_id = p.project_id
        LEFT JOIN landscape.tbl_phase ph ON ab.phase_id = ph.phase_id
        WHERE ab.phase_id=${phaseId}
        ORDER BY ab.start_period, ab.revenue_stream_name
      `;
    } else {
      // Get all absorption schedules for project
      result = await sql`
        SELECT
          ab.*,
          p.project_name,
          ph.phase_name,
          pa.parcel_code
        FROM landscape.tbl_absorption_schedule ab
        LEFT JOIN landscape.tbl_project p ON ab.project_id = p.project_id
        LEFT JOIN landscape.tbl_phase ph ON ab.phase_id = ph.phase_id
        LEFT JOIN landscape.tbl_parcel pa ON ab.parcel_id = pa.parcel_id
        WHERE ab.project_id=${projectId}
        ORDER BY ab.start_period, ab.revenue_stream_name
      `;
    }

    return NextResponse.json({
      success: true,
      data: result,
      count: result.length,
    });
  } catch (error: any) {
    console.error('Absorption GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch absorption schedules',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/absorption
 * Create a new absorption schedule
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      project_id,
      area_id,
      phase_id,
      parcel_id,
      revenue_stream_name,
      revenue_category,
      lu_family_name,
      lu_type_code,
      product_code,
      start_period,
      periods_to_complete,
      timing_method,
      units_per_period,
      total_units,
      base_price_per_unit,
      price_escalation_pct,
      scenario_name,
      probability_weight,
      notes,
    } = body;

    // Validation
    if (!project_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: project_id',
        },
        { status: 400 }
      );
    }

    if (!revenue_stream_name) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: revenue_stream_name',
        },
        { status: 400 }
      );
    }

    if (timing_method === 'ABSOLUTE' && start_period === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'start_period is required when timing_method is ABSOLUTE',
        },
        { status: 400 }
      );
    }

    // Insert absorption schedule
    const result = await sql`
      INSERT INTO landscape.tbl_absorption_schedule (
        project_id,
        area_id,
        phase_id,
        parcel_id,
        revenue_stream_name,
        revenue_category,
        lu_family_name,
        lu_type_code,
        product_code,
        start_period,
        periods_to_complete,
        timing_method,
        units_per_period,
        total_units,
        base_price_per_unit,
        price_escalation_pct,
        scenario_name,
        probability_weight,
        notes
      ) VALUES (
        ${project_id},
        ${area_id || null},
        ${phase_id || null},
        ${parcel_id || null},
        ${revenue_stream_name},
        ${revenue_category || null},
        ${lu_family_name || null},
        ${lu_type_code || null},
        ${product_code || null},
        ${start_period || null},
        ${periods_to_complete || null},
        ${timing_method || 'ABSOLUTE'},
        ${units_per_period || null},
        ${total_units || null},
        ${base_price_per_unit || null},
        ${price_escalation_pct || 0},
        ${scenario_name || 'Base Case'},
        ${probability_weight || 1.0},
        ${notes || null}
      ) RETURNING *
    `;

    return NextResponse.json({
      success: true,
      data: result[0],
      message: 'Absorption schedule created successfully',
    });
  } catch (error: any) {
    console.error('Absorption POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create absorption schedule',
      },
      { status: 500 }
    );
  }
}
