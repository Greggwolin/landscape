import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Convert BIGINT fields to numbers to prevent Neon string serialization issues
 */
function convertBigIntFields(turn: any) {
  return {
    ...turn,
    turn_id: Number(turn.turn_id),
    unit_id: Number(turn.unit_id),
  };
}

/**
 * GET /api/multifamily/turns
 * List turns filtered by project_id or unit_id
 */
export async function GET(request: NextRequest) {
  const client = await pool.connect();

  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('project_id');
    const unitId = searchParams.get('unit_id');
    const status = searchParams.get('status');

    if (!projectId && !unitId) {
      return NextResponse.json(
        { success: false, error: 'Either project_id or unit_id is required' },
        { status: 400 }
      );
    }

    let query = `
      SELECT
        t.turn_id,
        t.unit_id,
        t.move_out_date,
        t.make_ready_complete_date,
        t.next_move_in_date,
        t.total_vacant_days,
        t.cleaning_cost,
        t.painting_cost,
        t.carpet_flooring_cost,
        t.appliance_cost,
        t.other_cost,
        t.total_make_ready_cost,
        t.turn_status,
        t.notes,
        t.created_at,
        t.updated_at,
        u.unit_number,
        u.building_name,
        u.unit_type,
        u.project_id
      FROM landscape.tbl_multifamily_turn t
      JOIN landscape.tbl_multifamily_unit u ON t.unit_id = u.unit_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 0;

    if (projectId) {
      paramCount++;
      query += ` AND u.project_id = $${paramCount}`;
      params.push(projectId);
    }

    if (unitId) {
      paramCount++;
      query += ` AND t.unit_id = $${paramCount}`;
      params.push(unitId);
    }

    if (status) {
      paramCount++;
      query += ` AND t.turn_status = $${paramCount}`;
      params.push(status);
    }

    query += ' ORDER BY t.move_out_date DESC';

    const result = await client.query(query, params);
    const turns = result.rows.map((row) => ({
      ...convertBigIntFields(row),
      project_id: Number(row.project_id),
    }));

    return NextResponse.json({
      success: true,
      data: turns,
      count: turns.length,
    });
  } catch (error) {
    console.error('Error fetching multifamily turns:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch turns' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * POST /api/multifamily/turns
 * Create turn record with cost breakdown
 */
export async function POST(request: NextRequest) {
  const client = await pool.connect();

  try {
    const body = await request.json();
    const {
      unit_id,
      move_out_date,
      make_ready_complete_date,
      next_move_in_date,
      cleaning_cost = 0,
      painting_cost = 0,
      carpet_flooring_cost = 0,
      appliance_cost = 0,
      other_cost = 0,
      turn_status = 'VACANT',
      notes,
    } = body;

    // Validate required fields
    if (!unit_id || !move_out_date) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: unit_id, move_out_date' },
        { status: 400 }
      );
    }

    // Calculate total_vacant_days if we have both dates
    let total_vacant_days = null;
    if (next_move_in_date && move_out_date) {
      const moveOut = new Date(move_out_date);
      const moveIn = new Date(next_move_in_date);
      total_vacant_days = Math.floor((moveIn.getTime() - moveOut.getTime()) / (1000 * 60 * 60 * 24));
    }

    const query = `
      INSERT INTO landscape.tbl_multifamily_turn (
        unit_id,
        move_out_date,
        make_ready_complete_date,
        next_move_in_date,
        total_vacant_days,
        cleaning_cost,
        painting_cost,
        carpet_flooring_cost,
        appliance_cost,
        other_cost,
        turn_status,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const params = [
      unit_id,
      move_out_date,
      make_ready_complete_date,
      next_move_in_date,
      total_vacant_days,
      cleaning_cost,
      painting_cost,
      carpet_flooring_cost,
      appliance_cost,
      other_cost,
      turn_status,
      notes,
    ];

    const result = await client.query(query, params);
    const turn = convertBigIntFields(result.rows[0]);

    return NextResponse.json({
      success: true,
      data: turn,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating multifamily turn:', error);

    // Handle foreign key constraint violation
    if (error.code === '23503') {
      return NextResponse.json(
        { success: false, error: 'Invalid unit_id: unit does not exist' },
        { status: 404 }
      );
    }

    // Handle check constraint violation
    if (error.code === '23514') {
      return NextResponse.json(
        { success: false, error: 'Invalid turn data: check constraint violation' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create turn' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
