import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';

const sql = neon(process.env.DATABASE_URL!);

type Params = { params: Promise<{ projectId: string; accountId: string }> };

const ALLOWED_BASES = new Set([
  'FIXED_AMOUNT',
  'PER_UNSOLD_PARCEL',
  'PER_UNSOLD_ACRE',
  'PER_PCT_UNSOLD'
]);

export async function PUT(
  request: NextRequest,
  context: Params
) {
  try {
    const { projectId: projectIdParam, accountId: accountIdParam } = await context.params;
    const projectId = parseInt(projectIdParam);
    const accountId = parseInt(accountIdParam);

    if (isNaN(projectId) || isNaN(accountId)) {
      return NextResponse.json(
        { error: 'Invalid project ID or account ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const searchParams = request.nextUrl.searchParams;
    const overrideDiscriminator = searchParams.get('statement_discriminator') || body.statement_discriminator;

    const activeResult = await sql<{ active_opex_discriminator: string }[]>`
      SELECT active_opex_discriminator
      FROM landscape.tbl_project
      WHERE project_id = ${projectId}
      LIMIT 1
    `;
    const discriminator = overrideDiscriminator || activeResult[0]?.active_opex_discriminator || 'default';
    const hasRecognizedField = [
      'annual_amount',
      'calculation_basis',
      'unit_amount',
      'escalation_rate',
      'start_period',
      'payment_frequency',
      'notes'
    ].some((key) => Object.prototype.hasOwnProperty.call(body, key));

    if (!hasRecognizedField) {
      return NextResponse.json(
        { error: 'No valid fields provided for update' },
        { status: 400 }
      );
    }

    if (body.calculation_basis && !ALLOWED_BASES.has(body.calculation_basis)) {
      return NextResponse.json(
        { error: 'Invalid calculation_basis value' },
        { status: 400 }
      );
    }

    if (body.unit_amount !== undefined && (typeof body.unit_amount !== 'number' || isNaN(body.unit_amount))) {
      return NextResponse.json(
        { error: 'unit_amount must be a numeric value' },
        { status: 400 }
      );
    }

    if (body.annual_amount !== undefined && (typeof body.annual_amount !== 'number' || body.annual_amount < 0)) {
      return NextResponse.json(
        { error: 'annual_amount must be a non-negative number' },
        { status: 400 }
      );
    }

    if (body.escalation_rate !== undefined && (typeof body.escalation_rate !== 'number' || isNaN(body.escalation_rate))) {
      return NextResponse.json(
        { error: 'escalation_rate must be numeric' },
        { status: 400 }
      );
    }

    if (body.start_period !== undefined && (typeof body.start_period !== 'number' || isNaN(body.start_period))) {
      return NextResponse.json(
        { error: 'start_period must be numeric' },
        { status: 400 }
      );
    }

    if (body.payment_frequency !== undefined && typeof body.payment_frequency !== 'string') {
      return NextResponse.json(
        { error: 'payment_frequency must be a string' },
        { status: 400 }
      );
    }

    if (body.notes !== undefined && typeof body.notes !== 'string') {
      return NextResponse.json(
        { error: 'notes must be a string' },
        { status: 400 }
      );
    }

    // Validate that this account is editable (not calculated)
    // After migration 042, categories are in core_unit_cost_category
    const accountCheck = await sql<{ is_calculated: boolean }[]>`
      SELECT COALESCE(is_calculated, false) as is_calculated
      FROM landscape.core_unit_cost_category
      WHERE category_id = ${accountId}
    `;

    if (accountCheck.length === 0) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    if (accountCheck[0].is_calculated) {
      return NextResponse.json(
        { error: 'Cannot directly edit calculated accounts. Only leaf accounts can be edited.' },
        { status: 400 }
      );
    }

    const expenseResult = await sql<{
      opex_id: number;
      annual_amount: number | null;
      calculation_basis: string | null;
      unit_amount: number | null;
      is_auto_calculated: boolean | null;
      escalation_rate: number | null;
      start_period: number | null;
      payment_frequency: string | null;
      notes: string | null;
    }[]>`
      SELECT
        opex_id,
        annual_amount,
        calculation_basis,
        unit_amount,
        is_auto_calculated,
        escalation_rate,
        start_period,
        payment_frequency,
        notes
      FROM landscape.tbl_operating_expenses
      WHERE project_id = ${projectId}
        AND category_id = ${accountId}
        AND statement_discriminator = ${discriminator}
      LIMIT 1
    `;

    if (expenseResult.length === 0) {
      return NextResponse.json(
        { error: 'No expense record found for this account and project' },
        { status: 404 }
      );
    }

    const expense = expenseResult[0];
    const nextCalculationBasis = (body.calculation_basis ?? expense.calculation_basis ?? 'FIXED_AMOUNT') as string;
    let nextUnitAmount = body.unit_amount ?? expense.unit_amount ?? null;
    let nextAnnualAmount = expense.annual_amount ?? 0;
    let nextIsAutoCalculated = nextCalculationBasis !== 'FIXED_AMOUNT';

    if (nextCalculationBasis !== 'FIXED_AMOUNT' && body.annual_amount !== undefined) {
      return NextResponse.json(
        { error: 'Cannot directly edit annual_amount for auto-calculated expenses. Edit unit_amount or calculation_basis instead.' },
        { status: 400 }
      );
    }

    const shouldRecalculate =
      nextCalculationBasis !== 'FIXED_AMOUNT' &&
      (body.unit_amount !== undefined || body.calculation_basis !== undefined);

    if (shouldRecalculate) {
      nextUnitAmount = nextUnitAmount ?? 0;
      const calculatedAmount = await sql<{ amount: number | null }[]>`
        SELECT landscape.calculate_land_dev_opex(${projectId}, ${nextCalculationBasis}, ${nextUnitAmount}) AS amount
      `;
      nextAnnualAmount = Number(calculatedAmount[0]?.amount ?? 0);
    } else if (nextCalculationBasis !== 'FIXED_AMOUNT') {
      // Keep stored value but ensure we mark as auto-calculated
      nextAnnualAmount = expense.annual_amount ?? 0;
    }

    if (nextCalculationBasis === 'FIXED_AMOUNT') {
      nextIsAutoCalculated = false;
      if (body.annual_amount !== undefined) {
        nextAnnualAmount = body.annual_amount;
      }
      // For fixed amounts, unit_amount is not needed
      if (body.unit_amount !== undefined) {
        nextUnitAmount = body.unit_amount;
      } else if (expense.unit_amount !== null && expense.calculation_basis !== 'FIXED_AMOUNT') {
        nextUnitAmount = null;
      }
    }

    const finalEscalationRate =
      body.escalation_rate !== undefined ? body.escalation_rate : expense.escalation_rate;
    const finalStartPeriod =
      body.start_period !== undefined ? body.start_period : expense.start_period;
    const finalPaymentFrequency =
      body.payment_frequency !== undefined ? body.payment_frequency : expense.payment_frequency;
    const finalNotes = body.notes !== undefined ? body.notes : expense.notes;

    const updateResult = await sql`
      UPDATE landscape.tbl_operating_expenses
      SET annual_amount = ${nextAnnualAmount},
          calculation_basis = ${nextCalculationBasis},
          unit_amount = ${nextUnitAmount},
          is_auto_calculated = ${nextIsAutoCalculated},
          escalation_rate = ${finalEscalationRate},
          start_period = ${finalStartPeriod},
          payment_frequency = ${finalPaymentFrequency},
          notes = ${finalNotes},
          statement_discriminator = ${discriminator},
          updated_at = NOW()
      WHERE project_id = ${projectId}
        AND category_id = ${accountId}
        AND statement_discriminator = ${discriminator}
      RETURNING
        opex_id,
        annual_amount,
        calculation_basis,
        unit_amount,
        is_auto_calculated,
        escalation_rate,
        start_period,
        payment_frequency,
        notes
    `;

    const projectResult = await sql<{ project_type_code: string }[]>`
      SELECT project_type_code
      FROM landscape.tbl_project
      WHERE project_id = ${projectId}
      LIMIT 1
    `;

    let updatedTotals: unknown = null;
    if (projectResult.length > 0) {
      const projectType = projectResult[0].project_type_code;
      // Query unified category table for updated totals
      updatedTotals = await sql`
        SELECT
          c.category_id as account_id,
          c.account_number,
          c.category_name as account_name,
          COALESCE(c.account_level, 1) as account_level,
          c.parent_id as parent_account_id,
          COALESCE(c.is_calculated, false) as is_calculated,
          landscape.calculate_opex_account_total(${projectId}, c.category_id) AS calculated_total,
          c.sort_order
        FROM landscape.core_unit_cost_category c
        JOIN landscape.core_category_lifecycle_stages cls
          ON c.category_id = cls.category_id
        WHERE cls.activity = 'Operations'
          AND c.is_active = TRUE
          AND (
            c.property_types IS NULL
            OR ${projectType} = ANY(c.property_types)
          )
        ORDER BY c.sort_order
      `;
    }

    return NextResponse.json({
      success: true,
      updated_expense: updateResult[0],
      updated_totals: updatedTotals
    });

  } catch (error) {
    console.error('Error updating OpEx:', error);
    return NextResponse.json(
      { error: 'Failed to update operating expense', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
