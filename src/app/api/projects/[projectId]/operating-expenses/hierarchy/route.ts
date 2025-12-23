import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ projectId: string }> };

const sql = neon(process.env.DATABASE_URL!);

interface OpexAccount {
  account_id: number;
  account_number: string;
  account_name: string;
  account_level: number;
  parent_account_id: number | null;
  is_calculated: boolean;
  calculated_total: number;
  sort_order: number;
  opex_id: number | null;
  annual_amount: number | null;
  calculation_basis: string | null;
  unit_amount: number | null;
  is_auto_calculated: boolean | null;
  escalation_rate: number | null;
  start_period: number | null;
  payment_frequency: string | null;
  notes: string | null;
}

interface NestedAccount extends OpexAccount {
  children: NestedAccount[];
}

export async function GET(
  request: NextRequest,
  context: Params
) {
  try {
    const projectId = parseInt((await context.params).projectId);

    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    const projectResult = await sql<{ project_type_code: string }[]>`
      SELECT project_type_code
      FROM landscape.tbl_project
      WHERE project_id = ${projectId}
      LIMIT 1
    `;

    if (projectResult.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const projectType = projectResult[0].project_type_code;

    // Query core_unit_cost_category for Operations activity categories
    // This replaces the old tbl_opex_accounts query after migration 042
    const accounts = await sql<OpexAccount[]>`
      SELECT
        c.category_id as account_id,
        c.account_number,
        c.category_name as account_name,
        COALESCE(c.account_level, 1) as account_level,
        c.parent_id as parent_account_id,
        COALESCE(c.is_calculated, false) as is_calculated,
        landscape.calculate_opex_account_total(${projectId}, c.category_id) as calculated_total,
        c.sort_order,
        oe.opex_id,
        oe.annual_amount,
        oe.calculation_basis,
        oe.unit_amount,
        oe.is_auto_calculated,
        oe.escalation_rate,
        oe.start_period,
        oe.payment_frequency,
        oe.notes
      FROM landscape.core_unit_cost_category c
      JOIN landscape.core_category_lifecycle_stages cls
        ON c.category_id = cls.category_id
      LEFT JOIN landscape.tbl_operating_expenses oe
        ON oe.category_id = c.category_id
       AND oe.project_id = ${projectId}
      WHERE cls.activity = 'Operations'
        AND c.is_active = TRUE
        AND (
          c.property_types IS NULL
          OR ${projectType} = ANY(c.property_types)
        )
      ORDER BY c.sort_order
    `;

    // Transform flat list into nested hierarchy
    const accountMap = new Map<number, NestedAccount>();
    const rootAccounts: NestedAccount[] = [];

    accounts.forEach(account => {
      accountMap.set(account.account_id, {
        ...account,
        children: []
      });
    });

    accounts.forEach(account => {
      const node = accountMap.get(account.account_id)!;

      if (account.parent_account_id === null) {
        rootAccounts.push(node);
      } else {
        const parent = accountMap.get(account.parent_account_id);
        if (parent) {
          parent.children.push(node);
        }
      }
    });

    const totalOpex = rootAccounts.reduce((sum, acct) => sum + Number(acct.calculated_total), 0);
    const leafAccounts = accounts.filter(a => !a.is_calculated);

    return NextResponse.json({
      project_type_code: projectType,
      accounts: rootAccounts,
      summary: {
        total_operating_expenses: totalOpex,
        account_count: accounts.length,
        leaf_account_count: leafAccounts.length,
        entry_account_count: leafAccounts.length
      }
    });

  } catch (error) {
    console.error('Error fetching OpEx hierarchy:', error);
    return NextResponse.json(
      { error: 'Failed to fetch operating expense hierarchy', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
