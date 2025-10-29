/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * GET /api/capitalization/draws
 * List all draw schedule items for a project
 *
 * Query params:
 * - projectId (required): The project ID
 * - facility_id (optional): Filter by specific debt facility
 *
 * Returns draws with summary calculations:
 * - Total commitment
 * - Total drawn
 * - Remaining capacity
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const facilityId = searchParams.get('facility_id');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    const projectIdNum = Number.parseInt(projectId, 10);
    if (Number.isNaN(projectIdNum)) {
      return NextResponse.json(
        { success: false, error: 'Invalid projectId' },
        { status: 400 }
      );
    }
    const facilityIdText = facilityId && /^[0-9]+$/.test(facilityId) ? facilityId : null;

    // Build query - simplified to avoid variable assignment issues
    const draws = facilityIdText !== null
      ? await sql`
          SELECT
            ds.draw_id,
            ds.facility_id,
            df.project_id,
            ds.period_id,
            cp.period_sequence,
            ds.draw_amount,
            ds.cumulative_drawn,
            ds.draw_request_date,
            ds.draw_funded_date,
            ds.draw_status,
            ds.notes,
            ds.created_at
          FROM landscape.tbl_debt_draw_schedule ds
          JOIN landscape.tbl_debt_facility df ON ds.facility_id = df.facility_id
          LEFT JOIN landscape.tbl_calculation_period cp ON ds.period_id = cp.period_id
          WHERE df.project_id = ${projectIdNum}
            AND ds.facility_id::text = ${facilityIdText}
          ORDER BY ds.draw_request_date ASC, ds.period_id ASC
        `
      : await sql`
          SELECT
            ds.draw_id,
            ds.facility_id,
            df.project_id,
            ds.period_id,
            cp.period_sequence,
            ds.draw_amount,
            ds.cumulative_drawn,
            ds.draw_request_date,
            ds.draw_funded_date,
            ds.draw_status,
            ds.notes,
            ds.created_at
          FROM landscape.tbl_debt_draw_schedule ds
          JOIN landscape.tbl_debt_facility df ON ds.facility_id = df.facility_id
          LEFT JOIN landscape.tbl_calculation_period cp ON ds.period_id = cp.period_id
          WHERE df.project_id = ${projectIdNum}
          ORDER BY ds.draw_request_date ASC, ds.period_id ASC
        `;

    // Transform to component schema
    const transformedDraws = draws.map((d: any) => ({
      draw_id: Number(d.draw_id),
      debt_facility_id: d.facility_id != null ? String(d.facility_id) : null,
      project_id: Number(d.project_id),
      period_id: d.period_id ? Number(d.period_id) : null,
      period_name: d.period_sequence ? `Month ${d.period_sequence}` : 'Unscheduled',
      draw_amount: Number(d.draw_amount),
      draw_purpose: d.notes || '',
      draw_date: d.draw_request_date || d.draw_funded_date,
      created_at: d.created_at,
    }));

    // Calculate summary metrics
    const totalDrawn = draws.reduce((sum: number, d: any) => sum + Number(d.draw_amount), 0);

    // Get total commitment for the facility/facilities
    const commitment = facilityIdText !== null
      ? await sql`
          SELECT commitment_amount
          FROM landscape.tbl_debt_facility
          WHERE facility_id::text = ${facilityIdText}
        `
      : await sql`
          SELECT SUM(commitment_amount) as commitment_amount
          FROM landscape.tbl_debt_facility
          WHERE project_id = ${projectIdNum}
        `;
    const totalCommitment = commitment.length > 0 ? Number(commitment[0].commitment_amount) : 0;
    const remainingCapacity = totalCommitment - totalDrawn;

    return NextResponse.json({
      success: true,
      data: transformedDraws,
      summary: {
        total_commitment: totalCommitment,
        total_drawn: totalDrawn,
        remaining_capacity: remainingCapacity,
      },
    });
  } catch (error) {
    console.error('Error fetching draw schedule:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch draw schedule' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/capitalization/draws
 * Create a new draw schedule item
 *
 * Validates that total draws don't exceed commitment_amount
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      facility_id,
      period_id,
      draw_amount,
      draw_date,
      draw_purpose,
      draw_status = 'PROJECTED',
    } = body;

    // Validation
    if (!facility_id || !draw_amount || !draw_date) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: facility_id, draw_amount, draw_date',
        },
        { status: 400 }
      );
    }

    if (!/^[0-9]+$/.test(String(facility_id))) {
      return NextResponse.json(
        { success: false, error: 'Invalid facility_id value' },
        { status: 400 }
      );
    }
    const facilityIdText = String(facility_id);

    if (draw_amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'draw_amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Get facility commitment and existing draws
    const facility = await sql`
      SELECT commitment_amount, project_id
      FROM landscape.tbl_debt_facility
      WHERE facility_id::text = ${facilityIdText}
    `;

    if (facility.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Debt facility not found' },
        { status: 404 }
      );
    }

    const commitment = Number(facility[0].commitment_amount);

    // Calculate total existing draws
    const existingDraws = await sql`
      SELECT COALESCE(SUM(draw_amount), 0) as total_drawn
      FROM landscape.tbl_debt_draw_schedule
      WHERE facility_id::text = ${facilityIdText}
    `;

    const currentTotalDrawn = Number(existingDraws[0].total_drawn);
    const newTotalDrawn = currentTotalDrawn + draw_amount;

    if (newTotalDrawn > commitment) {
      return NextResponse.json(
        {
          success: false,
          error: `Total draws would exceed commitment. Commitment: $${commitment.toLocaleString()}, Existing draws: $${currentTotalDrawn.toLocaleString()}, New draw: $${draw_amount.toLocaleString()}, Total: $${newTotalDrawn.toLocaleString()}`,
          details: {
            commitment_amount: commitment,
            existing_draws: currentTotalDrawn,
            new_draw: draw_amount,
            new_total: newTotalDrawn,
            remaining_capacity: commitment - currentTotalDrawn,
          },
        },
        { status: 400 }
      );
    }

    // Calculate cumulative drawn
    const cumulativeDrawn = newTotalDrawn;

    const result = await sql`
      INSERT INTO landscape.tbl_debt_draw_schedule (
        facility_id,
        period_id,
        draw_amount,
        cumulative_drawn,
        draw_request_date,
        draw_status,
        notes
      ) VALUES (
        ${facilityIdText}::bigint,
        ${period_id || null},
        ${draw_amount},
        ${cumulativeDrawn},
        ${draw_date},
        ${draw_status},
        ${draw_purpose || null}
      )
      RETURNING draw_id, facility_id, draw_amount, cumulative_drawn, draw_request_date, created_at
    `;

    const newDraw = result[0];

    return NextResponse.json(
      {
        success: true,
        data: {
          draw_id: Number(newDraw.draw_id),
          debt_facility_id: newDraw.facility_id != null ? String(newDraw.facility_id) : null,
          draw_amount: Number(newDraw.draw_amount),
          draw_date: newDraw.draw_request_date,
        },
        message: 'Draw schedule item created successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating draw schedule item:', error);

    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'Draw already exists for this facility and period' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create draw schedule item' },
      { status: 500 }
    );
  }
}
