import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const FREQUENCY_LABELS: Record<string, string> = {
  one_time: 'One-Time',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
};

const CONTAINER_LEVEL_LABELS: Record<string, string> = {
  project: 'Project',
  phase: 'Phase',
  subdivision: 'Subdivision',
  building: 'Building',
};

function calculateTotalAmount(amount: number, frequency: string, durationPeriods: number): number {
  if (frequency === 'one_time') {
    return amount;
  }
  return amount * durationPeriods;
}

interface RouteParams {
  params: Promise<{ itemId: string }>;
}

/**
 * GET /api/developer-operations/overhead/[itemId]
 * Get a single management overhead item by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { itemId } = await params;

    const result = await sql`
      SELECT *
      FROM landscape.management_overhead
      WHERE id = ${parseInt(itemId)}
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Management overhead item not found' },
        { status: 404 }
      );
    }

    const item = result[0];
    const itemAmount = Number(item.amount);
    const itemDuration = Number(item.duration_periods || 1);
    const totalAmount = calculateTotalAmount(itemAmount, item.frequency, itemDuration);

    return NextResponse.json({
      id: Number(item.id),
      project_id: Number(item.project_id),
      item_name: item.item_name,
      amount: itemAmount,
      frequency: item.frequency,
      frequency_display: FREQUENCY_LABELS[item.frequency] || item.frequency,
      start_period: Number(item.start_period || 1),
      duration_periods: itemDuration,
      container_level: item.container_level,
      container_level_display: item.container_level
        ? CONTAINER_LEVEL_LABELS[item.container_level] || item.container_level
        : null,
      container_id: item.container_id ? Number(item.container_id) : null,
      notes: item.notes,
      total_amount: totalAmount,
      created_at: item.created_at,
      updated_at: item.updated_at,
    });
  } catch (error) {
    console.error('Error fetching management overhead item:', error);
    return NextResponse.json(
      { error: 'Failed to fetch management overhead item' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/developer-operations/overhead/[itemId]
 * Update a management overhead item
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { itemId } = await params;
    const body = await request.json();

    const {
      item_name,
      amount,
      frequency,
      start_period,
      duration_periods,
      container_level,
      container_id,
      notes,
    } = body;

    // Build dynamic update - only update fields that were sent
    const updates: string[] = [];
    const values: (string | number | null)[] = [];
    let paramIndex = 1;

    if (item_name !== undefined) {
      updates.push(`item_name = $${paramIndex++}`);
      values.push(item_name);
    }
    if (amount !== undefined) {
      updates.push(`amount = $${paramIndex++}`);
      values.push(amount);
    }
    if (frequency !== undefined) {
      updates.push(`frequency = $${paramIndex++}`);
      values.push(frequency);
    }
    if (start_period !== undefined) {
      updates.push(`start_period = $${paramIndex++}`);
      values.push(start_period);
    }
    if (duration_periods !== undefined) {
      updates.push(`duration_periods = $${paramIndex++}`);
      values.push(duration_periods);
    }
    if (container_level !== undefined) {
      updates.push(`container_level = $${paramIndex++}`);
      values.push(container_level);
    }
    if (container_id !== undefined) {
      updates.push(`container_id = $${paramIndex++}`);
      values.push(container_id);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(notes);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');

    const result = await sql.unsafe(
      `UPDATE landscape.management_overhead SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      [...values, parseInt(itemId)]
    );

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Management overhead item not found' },
        { status: 404 }
      );
    }

    const item = result[0];
    const itemAmount = Number(item.amount);
    const itemDuration = Number(item.duration_periods || 1);
    const totalAmount = calculateTotalAmount(itemAmount, item.frequency, itemDuration);

    return NextResponse.json({
      id: Number(item.id),
      project_id: Number(item.project_id),
      item_name: item.item_name,
      amount: itemAmount,
      frequency: item.frequency,
      frequency_display: FREQUENCY_LABELS[item.frequency] || item.frequency,
      start_period: Number(item.start_period || 1),
      duration_periods: itemDuration,
      container_level: item.container_level,
      container_level_display: item.container_level
        ? CONTAINER_LEVEL_LABELS[item.container_level] || item.container_level
        : null,
      container_id: item.container_id ? Number(item.container_id) : null,
      notes: item.notes,
      total_amount: totalAmount,
      created_at: item.created_at,
      updated_at: item.updated_at,
    });
  } catch (error) {
    console.error('Error updating management overhead item:', error);
    return NextResponse.json(
      { error: 'Failed to update management overhead item' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/developer-operations/overhead/[itemId]
 * Delete a management overhead item
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { itemId } = await params;

    const result = await sql`
      DELETE FROM landscape.management_overhead
      WHERE id = ${parseInt(itemId)}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Management overhead item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, id: parseInt(itemId) });
  } catch (error) {
    console.error('Error deleting management overhead item:', error);
    return NextResponse.json(
      { error: 'Failed to delete management overhead item' },
      { status: 500 }
    );
  }
}
