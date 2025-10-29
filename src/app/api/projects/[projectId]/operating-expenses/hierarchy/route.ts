import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';

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
}

interface NestedAccount extends OpexAccount {
  children: NestedAccount[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = parseInt(params.projectId);

    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    // Get flat list with calculated totals from database function
    const accounts = await sql<OpexAccount[]>`
      SELECT * FROM landscape.get_opex_hierarchy_with_totals(${projectId})
    `;

    // Transform flat list into nested hierarchy
    const accountMap = new Map<number, NestedAccount>();
    const rootAccounts: NestedAccount[] = [];

    // First pass: Create map of all accounts with empty children arrays
    accounts.forEach(account => {
      accountMap.set(account.account_id, {
        ...account,
        children: []
      });
    });

    // Second pass: Build hierarchy by assigning children to parents
    accounts.forEach(account => {
      const node = accountMap.get(account.account_id)!;

      if (account.parent_account_id === null) {
        // Root level account (Level 1 - Parents)
        rootAccounts.push(node);
      } else {
        // Child or grandchild - add to parent's children array
        const parent = accountMap.get(account.parent_account_id);
        if (parent) {
          parent.children.push(node);
        }
      }
    });

    // Calculate summary statistics
    const totalOpex = rootAccounts.reduce((sum, acct) => sum + Number(acct.calculated_total), 0);
    const leafAccounts = accounts.filter(a => !a.is_calculated);

    return NextResponse.json({
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
