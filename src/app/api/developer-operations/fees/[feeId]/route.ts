import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const FEE_TYPE_LABELS: Record<string, string> = {
  development: 'Development Fee',
  construction_mgmt: 'Construction Management Fee',
  acquisition: 'Acquisition Fee',
  disposition: 'Disposition Fee',
  asset_mgmt: 'Asset Management Fee',
  other: 'Other Fee',
};

const BASIS_TYPE_LABELS: Record<string, string> = {
  percent_of_acquisition: '% of Land Acquisition',
  percent_of_hard_costs: '% of Hard Costs',
  percent_of_soft_costs: '% of Soft Costs',
  percent_of_total_costs: '% of Total Dev Costs',
  percent_of_revenue: '% of Revenue',
  percent_of_equity: '% of Equity',
  flat_fee: 'Fixed Amount',
  // Legacy support
  percent_total_cost: '% of Total Project Cost',
  percent_hard_cost: '% of Hard Costs',
  percent_soft_cost: '% of Soft Costs',
  per_unit: 'Per Unit',
  per_sf: 'Per Square Foot',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  paid: 'Paid',
  partial: 'Partially Paid',
};

interface RouteParams {
  params: Promise<{ feeId: string }>;
}

/**
 * GET /api/developer-operations/fees/[feeId]
 * Get a single developer fee by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { feeId } = await params;

    const result = await sql`
      SELECT *
      FROM landscape.developer_fees
      WHERE id = ${parseInt(feeId)}
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Developer fee not found' },
        { status: 404 }
      );
    }

    const f = result[0];

    return NextResponse.json({
      id: Number(f.id),
      project_id: Number(f.project_id),
      fee_type: f.fee_type,
      fee_type_display: FEE_TYPE_LABELS[f.fee_type] || f.fee_type,
      fee_description: f.fee_description,
      basis_type: f.basis_type,
      basis_type_display: BASIS_TYPE_LABELS[f.basis_type] || f.basis_type,
      basis_value: f.basis_value ? Number(f.basis_value) : null,
      calculated_amount: f.calculated_amount ? Number(f.calculated_amount) : null,
      payment_timing: f.payment_timing,
      timing_start_period: Number(f.timing_start_period) || 1,
      timing_duration_periods: Number(f.timing_duration_periods) || 1,
      status: f.status,
      status_display: STATUS_LABELS[f.status] || f.status,
      notes: f.notes,
      created_at: f.created_at,
      updated_at: f.updated_at,
    });
  } catch (error) {
    console.error('Error fetching developer fee:', error);
    return NextResponse.json(
      { error: 'Failed to fetch developer fee' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/developer-operations/fees/[feeId]
 * Update a developer fee
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { feeId } = await params;
    const body = await request.json();

    const {
      fee_type,
      fee_description,
      basis_type,
      basis_value,
      calculated_amount,
      payment_timing,
      timing_start_period,
      timing_duration_periods,
      status,
      notes,
    } = body;

    // Build dynamic update - only update fields that were sent
    const updates: string[] = [];
    const values: (string | number | null)[] = [];
    let paramIndex = 1;

    if (fee_type !== undefined) {
      updates.push(`fee_type = $${paramIndex++}`);
      values.push(fee_type);
    }
    if (fee_description !== undefined) {
      updates.push(`fee_description = $${paramIndex++}`);
      values.push(fee_description);
    }
    if (basis_type !== undefined) {
      updates.push(`basis_type = $${paramIndex++}`);
      values.push(basis_type);
    }
    if (basis_value !== undefined) {
      updates.push(`basis_value = $${paramIndex++}`);
      values.push(basis_value);
    }
    if (calculated_amount !== undefined) {
      updates.push(`calculated_amount = $${paramIndex++}`);
      values.push(calculated_amount);
    }
    if (payment_timing !== undefined) {
      updates.push(`payment_timing = $${paramIndex++}`);
      values.push(payment_timing);
    }
    if (timing_start_period !== undefined) {
      updates.push(`timing_start_period = $${paramIndex++}`);
      values.push(timing_start_period);
    }
    if (timing_duration_periods !== undefined) {
      updates.push(`timing_duration_periods = $${paramIndex++}`);
      values.push(timing_duration_periods);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(notes);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');

    const result = await sql.unsafe(
      `UPDATE landscape.developer_fees SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      [...values, parseInt(feeId)]
    );

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Developer fee not found' },
        { status: 404 }
      );
    }

    const f = result[0];

    return NextResponse.json({
      id: Number(f.id),
      project_id: Number(f.project_id),
      fee_type: f.fee_type,
      fee_type_display: FEE_TYPE_LABELS[f.fee_type] || f.fee_type,
      fee_description: f.fee_description,
      basis_type: f.basis_type,
      basis_type_display: BASIS_TYPE_LABELS[f.basis_type] || f.basis_type,
      basis_value: f.basis_value ? Number(f.basis_value) : null,
      calculated_amount: f.calculated_amount ? Number(f.calculated_amount) : null,
      payment_timing: f.payment_timing,
      timing_start_period: Number(f.timing_start_period) || 1,
      timing_duration_periods: Number(f.timing_duration_periods) || 1,
      status: f.status,
      status_display: STATUS_LABELS[f.status] || f.status,
      notes: f.notes,
      created_at: f.created_at,
      updated_at: f.updated_at,
    });
  } catch (error) {
    console.error('Error updating developer fee:', error);
    return NextResponse.json(
      { error: 'Failed to update developer fee' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/developer-operations/fees/[feeId]
 * Delete a developer fee
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { feeId } = await params;

    const result = await sql`
      DELETE FROM landscape.developer_fees
      WHERE id = ${parseInt(feeId)}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Developer fee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, id: parseInt(feeId) });
  } catch (error) {
    console.error('Error deleting developer fee:', error);
    return NextResponse.json(
      { error: 'Failed to delete developer fee' },
      { status: 500 }
    );
  }
}
