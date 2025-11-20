import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type Params = {
  projectId: string;
  scenarioId: string;
};

/**
 * DELETE /api/projects/[projectId]/scenarios/[scenarioId]
 *
 * Delete a saved scenario.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { projectId, scenarioId } = await params;
  const id = Number(projectId);
  const scId = Number(scenarioId);

  if (!Number.isFinite(id) || !Number.isFinite(scId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    await sql`
      DELETE FROM landscape.sensitivity_scenarios
      WHERE project_id = ${id}
        AND scenario_id = ${scId}
    `;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to delete scenario:', error);
    return NextResponse.json(
      { error: 'Failed to delete scenario', details: message },
      { status: 500 }
    );
  }
}
