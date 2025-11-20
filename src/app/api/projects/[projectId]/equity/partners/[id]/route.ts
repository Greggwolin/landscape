import { NextRequest, NextResponse } from 'next/server';

type Params = {
  projectId: string;
  id: string;
};

/**
 * NOTE: Equity partner CRUD not yet supported.
 * Duplicate landscape.equity_partners table removed.
 * Proper equity partner schema needed before enabling these endpoints.
 */

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  return NextResponse.json({
    success: false,
    message: 'Equity partner update not yet implemented. Proper schema needed.'
  }, { status: 501 });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  return NextResponse.json({
    success: false,
    message: 'Equity partner deletion not yet implemented. Proper schema needed.'
  }, { status: 501 });
}
