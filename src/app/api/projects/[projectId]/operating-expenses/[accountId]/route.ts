import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';

const sql = neon(process.env.DATABASE_URL!);

type Params = { params: Promise<{ projectId: string; accountId: string }> };

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
    const { annual_amount } = body;

    if (typeof annual_amount !== 'number' || annual_amount < 0) {
      return NextResponse.json(
        { error: 'Invalid annual amount' },
        { status: 400 }
      );
    }

    // Validate that this account is editable (not calculated)
    const accountCheck = await sql`
      SELECT is_calculated
      FROM landscape.tbl_opex_accounts
      WHERE account_id = ${accountId}
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

    // Update the expense amount
    const updateResult = await sql`
      UPDATE landscape.tbl_operating_expenses
      SET annual_amount = ${annual_amount},
          updated_at = NOW()
      WHERE project_id = ${projectId}
        AND account_id = ${accountId}
      RETURNING opex_id, annual_amount
    `;

    if (updateResult.length === 0) {
      return NextResponse.json(
        { error: 'No expense record found for this account and project' },
        { status: 404 }
      );
    }

    // Return updated totals for all accounts (triggers recalculation)
    const updatedTotals = await sql`
      SELECT * FROM landscape.get_opex_hierarchy_with_totals(${projectId})
    `;

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
