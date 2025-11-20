import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type Params = { params: Promise<{ projectId: string }> };

// GET /api/projects/{projectId}/opex
export async function GET(
  request: NextRequest,
  context: Params
) {
  try {
    const { projectId } = await context.params;
    const projectIdNum = parseInt(projectId);

    const expenses = await sql`
      SELECT
        opex_id,
        project_id,
        expense_category,
        expense_type,
        annual_amount,
        amount_per_sf,
        is_recoverable,
        recovery_rate,
        escalation_type,
        escalation_rate,
        start_period,
        payment_frequency,
        notes,
        created_at,
        updated_at
      FROM landscape.tbl_operating_expenses
      WHERE project_id = ${projectIdNum}
      ORDER BY expense_category, expense_type
    `;

    return NextResponse.json({ expenses });

  } catch (error) {
    console.error('Error fetching operating expenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch operating expenses' },
      { status: 500 }
    );
  }
}

// POST /api/projects/{projectId}/opex
export async function POST(
  request: NextRequest,
  context: Params
) {
  try {
    const { projectId } = await context.params;
    const projectIdNum = parseInt(projectId);
    const body = await request.json();

    const { expenses } = body;

    if (!expenses || !Array.isArray(expenses)) {
      return NextResponse.json(
        { error: 'Invalid expenses data' },
        { status: 400 }
      );
    }

    // Upsert operating expenses
    for (const expense of expenses) {
      if (expense.opex_id) {
        // Update existing
        await sql`
          UPDATE landscape.tbl_operating_expenses
          SET
            expense_category = ${expense.expense_category},
            expense_type = ${expense.expense_type},
            annual_amount = ${expense.annual_amount},
            amount_per_sf = ${expense.amount_per_sf || null},
            is_recoverable = ${expense.is_recoverable !== undefined ? expense.is_recoverable : true},
            recovery_rate = ${expense.recovery_rate || 1.0},
            escalation_type = ${expense.escalation_type || 'FIXED_PERCENT'},
            escalation_rate = ${expense.escalation_rate || 0.03},
            start_period = ${expense.start_period},
            payment_frequency = ${expense.payment_frequency || 'MONTHLY'},
            notes = ${expense.notes || null},
            updated_at = NOW()
          WHERE opex_id = ${expense.opex_id}
            AND project_id = ${projectIdNum}
        `;
      } else {
        // Insert new
        await sql`
          INSERT INTO landscape.tbl_operating_expenses (
            project_id,
            expense_category,
            expense_type,
            annual_amount,
            amount_per_sf,
            is_recoverable,
            recovery_rate,
            escalation_type,
            escalation_rate,
            start_period,
            payment_frequency,
            notes
          ) VALUES (
            ${projectIdNum},
            ${expense.expense_category},
            ${expense.expense_type},
            ${expense.annual_amount},
            ${expense.amount_per_sf || null},
            ${expense.is_recoverable !== undefined ? expense.is_recoverable : true},
            ${expense.recovery_rate || 1.0},
            ${expense.escalation_type || 'FIXED_PERCENT'},
            ${expense.escalation_rate || 0.03},
            ${expense.start_period},
            ${expense.payment_frequency || 'MONTHLY'},
            ${expense.notes || null}
          )
        `;
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error saving operating expenses:', error);
    return NextResponse.json(
      { error: 'Failed to save operating expenses' },
      { status: 500 }
    );
  }
}
