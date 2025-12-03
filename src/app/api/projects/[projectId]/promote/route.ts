// /app/api/projects/[projectId]/promote/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const projectIdNum = parseInt(projectId, 10);

    if (isNaN(projectIdNum)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    // Update the analysis_mode to 'developer'
    await sql`
      UPDATE landscape.tbl_project
      SET
        analysis_mode = 'developer',
        updated_at = NOW()
      WHERE project_id = ${projectIdNum}
    `;

    // Fetch the updated project to return
    const updatedProject = await sql`
      SELECT
        project_id,
        project_name,
        analysis_mode,
        updated_at
      FROM landscape.tbl_project
      WHERE project_id = ${projectIdNum}
    `;

    if (updatedProject.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Project promoted to developer mode',
      project: updatedProject[0]
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error promoting project:', error);
    return NextResponse.json(
      {
        error: 'Failed to promote project',
        details: message
      },
      { status: 500 }
    );
  }
}
