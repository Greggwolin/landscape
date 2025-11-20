import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ projectId: string }> };

// GET /api/projects/:projectId/assumptions/financing
export async function GET(
  request: NextRequest,
  context: Params
) {
  try {
    const _projectId = parseInt((await context.params).projectId);

    // Note: Using existing tbl_debt_facility table with different structure
    // This endpoint returns default values for now
    return NextResponse.json({
      loan_amount: null,
      interest_rate_pct: null,
      amortization_years: 30,
      loan_term_years: 10,
      ltv_pct: 70.0,
      dscr: 1.25
    });

  } catch (error) {
    console.error('Error fetching financing assumptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financing assumptions' },
      { status: 500 }
    );
  }
}

// POST /api/projects/:projectId/assumptions/financing
export async function POST(
  request: NextRequest,
  context: Params
) {
  try {
    const _projectId = parseInt((await context.params).projectId);
    const data = await request.json();

    // For now, return the data back
    // Full implementation would integrate with existing debt facility table
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error saving financing assumptions:', error);
    return NextResponse.json(
      { error: 'Failed to save financing assumptions' },
      { status: 500 }
    );
  }
}
