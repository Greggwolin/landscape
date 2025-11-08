import { NextResponse } from 'next/server';

import { getLeaseSummary, getRentRoll } from '@/lib/financial-engine/db';

type Params = { params: Promise<{ projectId: string }> };

/**
 * GET /api/projects/[projectId]/lease-summary
 * Get lease summary and rent roll for a project
 */
export const GET = async (_request: Request, context: Params) => {
  try {
    const projectId = parseInt((await context.params).projectId, 10);

    if (isNaN(projectId)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    const [summary, rentRoll] = await Promise.all([
      getLeaseSummary(projectId),
      getRentRoll(projectId),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        summary,
        rentRoll,
      },
    });
  } catch (error) {
    console.error('Error fetching lease summary:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch lease summary' },
      { status: 500 }
    );
  }
};
