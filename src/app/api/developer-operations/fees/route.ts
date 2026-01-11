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

/**
 * Calculate fee amount based on basis type and project financials
 */
async function calculateFeeAmount(
  basisType: string,
  basisValue: number | null,
  projectId: number
): Promise<number | null> {
  if (!basisValue) return null;

  // For flat fee, just return the value
  if (basisType === 'flat_fee') {
    return basisValue;
  }

  try {
    // Fetch project financials based on basis type
    let baseAmount = 0;

    if (basisType === 'percent_of_acquisition') {
      // Get land acquisition from project or budget
      const projectRes = await sql`
        SELECT land_cost FROM landscape.tbl_project WHERE project_id = ${projectId}
      `;
      baseAmount = projectRes[0]?.land_cost ? Number(projectRes[0].land_cost) : 0;
    } else if (basisType === 'percent_of_hard_costs' || basisType === 'percent_hard_cost') {
      // Get hard costs from budget
      const budgetRes = await sql`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM landscape.project_budget_items bi
        JOIN landscape.budget_categories bc ON bi.category_id = bc.id
        WHERE bi.project_id = ${projectId}
        AND bc.cost_type = 'hard'
      `;
      baseAmount = Number(budgetRes[0]?.total) || 0;
    } else if (basisType === 'percent_of_soft_costs' || basisType === 'percent_soft_cost') {
      // Get soft costs from budget
      const budgetRes = await sql`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM landscape.project_budget_items bi
        JOIN landscape.budget_categories bc ON bi.category_id = bc.id
        WHERE bi.project_id = ${projectId}
        AND bc.cost_type = 'soft'
      `;
      baseAmount = Number(budgetRes[0]?.total) || 0;
    } else if (basisType === 'percent_of_total_costs' || basisType === 'percent_total_cost') {
      // Get total development costs from budget
      const budgetRes = await sql`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM landscape.project_budget_items
        WHERE project_id = ${projectId}
      `;
      baseAmount = Number(budgetRes[0]?.total) || 0;
    } else if (basisType === 'percent_of_revenue') {
      // Get gross revenue from project
      const projectRes = await sql`
        SELECT gross_revenue FROM landscape.tbl_project WHERE project_id = ${projectId}
      `;
      baseAmount = projectRes[0]?.gross_revenue ? Number(projectRes[0].gross_revenue) : 0;
    } else if (basisType === 'percent_of_equity') {
      // Get total equity from cash flow summary
      const equityRes = await sql`
        SELECT COALESCE(ABS(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END)), 0) as total_equity
        FROM landscape.cash_flows
        WHERE project_id = ${projectId}
      `;
      baseAmount = Number(equityRes[0]?.total_equity) || 0;
    }

    if (baseAmount === 0) {
      console.warn(`No base amount found for basis type ${basisType}, project ${projectId}`);
      return null;
    }

    return baseAmount * (basisValue / 100);
  } catch (err) {
    console.error('Error calculating fee amount:', err);
    return null;
  }
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  paid: 'Paid',
  partial: 'Partially Paid',
};

/**
 * GET /api/developer-operations/fees
 * List all developer fees for a project with summary
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    const fees = await sql`
      SELECT
        id,
        project_id,
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
        created_at,
        updated_at
      FROM landscape.developer_fees
      WHERE project_id = ${parseInt(projectId)}
      ORDER BY fee_type, created_at
    `;

    // Transform with display labels
    const transformedFees = fees.map((f) => ({
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
    }));

    // Calculate summary
    const totalFees = transformedFees.reduce((sum, f) => sum + (f.calculated_amount || 0), 0);
    const feesByType: Record<string, number> = {};
    transformedFees.forEach((f) => {
      if (f.calculated_amount) {
        feesByType[f.fee_type] = (feesByType[f.fee_type] || 0) + f.calculated_amount;
      }
    });
    const pendingAmount = transformedFees
      .filter((f) => f.status === 'pending' || f.status === 'approved')
      .reduce((sum, f) => sum + (f.calculated_amount || 0), 0);
    const paidAmount = transformedFees
      .filter((f) => f.status === 'paid')
      .reduce((sum, f) => sum + (f.calculated_amount || 0), 0);

    return NextResponse.json({
      fees: transformedFees,
      summary: {
        total_fees: totalFees,
        fees_by_type: feesByType,
        pending_amount: pendingAmount,
        paid_amount: paidAmount,
      },
    });
  } catch (error) {
    console.error('Error fetching developer fees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch developer fees' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/developer-operations/fees
 * Create a new developer fee
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      project_id,
      fee_type,
      fee_description,
      basis_type,
      basis_value,
      calculated_amount: providedAmount,
      payment_timing,
      timing_start_period = 1,
      timing_duration_periods = 1,
      status = 'pending',
      notes,
    } = body;

    if (!project_id || !fee_type || !basis_type) {
      return NextResponse.json(
        { error: 'project_id, fee_type, and basis_type are required' },
        { status: 400 }
      );
    }

    // Auto-calculate amount if not provided
    let calculated_amount = providedAmount;
    if (!calculated_amount && basis_value) {
      calculated_amount = await calculateFeeAmount(basis_type, basis_value, project_id);
    }

    const result = await sql`
      INSERT INTO landscape.developer_fees (
        project_id,
        fee_type,
        fee_description,
        basis_type,
        basis_value,
        calculated_amount,
        payment_timing,
        timing_start_period,
        timing_duration_periods,
        status,
        notes
      ) VALUES (
        ${project_id},
        ${fee_type},
        ${fee_description || null},
        ${basis_type},
        ${basis_value || null},
        ${calculated_amount || null},
        ${payment_timing || null},
        ${timing_start_period},
        ${timing_duration_periods},
        ${status},
        ${notes || null}
      )
      RETURNING *
    `;

    const newFee = result[0];

    return NextResponse.json(
      {
        id: Number(newFee.id),
        project_id: Number(newFee.project_id),
        fee_type: newFee.fee_type,
        fee_type_display: FEE_TYPE_LABELS[newFee.fee_type] || newFee.fee_type,
        fee_description: newFee.fee_description,
        basis_type: newFee.basis_type,
        basis_type_display: BASIS_TYPE_LABELS[newFee.basis_type] || newFee.basis_type,
        basis_value: newFee.basis_value ? Number(newFee.basis_value) : null,
        calculated_amount: newFee.calculated_amount ? Number(newFee.calculated_amount) : null,
        payment_timing: newFee.payment_timing,
        timing_start_period: Number(newFee.timing_start_period) || 1,
        timing_duration_periods: Number(newFee.timing_duration_periods) || 1,
        status: newFee.status,
        status_display: STATUS_LABELS[newFee.status] || newFee.status,
        notes: newFee.notes,
        created_at: newFee.created_at,
        updated_at: newFee.updated_at,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating developer fee:', error);
    return NextResponse.json(
      { error: 'Failed to create developer fee' },
      { status: 500 }
    );
  }
}
