import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type Params = {
  projectId: string;
};

/**
 * GET /api/projects/[projectId]/equity/partners
 *
 * NOTE: Existing database does not have a dedicated equity_partners table.
 * The tbl_finance_structure table is for cost allocation, not equity partners.
 *
 * This endpoint currently returns empty data. Future enhancement:
 * - Create dedicated equity_partners table
 * - OR extend tbl_finance_structure to handle equity partners
 * - OR use a different existing table if available
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { projectId } = await params;
  const id = Number(projectId);

  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }

  try {
    // Returning empty array until proper equity partner tracking is established
    // The duplicate landscape.equity_partners table has been removed
    const partners: any[] = [];

    return NextResponse.json({ partners });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to fetch partners:', error);
    return NextResponse.json(
      { error: 'Failed to fetch partners', details: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[projectId]/equity/partners
 *
 * NOTE: Equity partner creation not yet supported.
 * Requires dedicated equity_partners table or schema extension.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { projectId } = await params;
  const id = Number(projectId);

  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }

  try {
    const body = await request.json();

    return NextResponse.json({
      success: false,
      message: 'Equity partner tracking not yet implemented. Duplicate table removed, proper schema needed.'
    }, { status: 501 }); // 501 Not Implemented
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to create partner:', error);
    return NextResponse.json(
      { error: 'Failed to create partner', details: message },
      { status: 500 }
    );
  }
}
