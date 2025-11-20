import { NextRequest, NextResponse } from 'next/server';

type Params = {
  projectId: string;
};

/**
 * GET /api/projects/[projectId]/equity/waterfall
 *
 * NOTE: Waterfall structure not yet implemented with existing schema.
 * Duplicate landscape.waterfall_tiers table removed.
 * Proper equity waterfall schema needed.
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
    // Returning empty array until proper waterfall tracking is established
    const tiers: any[] = [];

    return NextResponse.json({ tiers });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to fetch waterfall:', error);
    return NextResponse.json(
      { error: 'Failed to fetch waterfall', details: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[projectId]/equity/waterfall
 *
 * NOTE: Waterfall configuration not yet supported.
 * Proper equity waterfall schema needed.
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
      message: 'Waterfall configuration not yet implemented. Duplicate tables removed, proper schema needed.'
    }, { status: 501 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to save waterfall:', error);
    return NextResponse.json(
      { error: 'Failed to save waterfall', details: message },
      { status: 500 }
    );
  }
}
