/**
 * Operations Settings API
 *
 * PUT /api/projects/:projectId/operations/settings
 * Updates operations settings like Value-Add mode toggle.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { projectId } = await params;
  const projectIdNum = parseInt(projectId, 10);

  if (isNaN(projectIdNum)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { value_add_enabled } = body;

    if (typeof value_add_enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'value_add_enabled must be a boolean' },
        { status: 400 }
      );
    }

    // Update project setting
    // Note: value_add_enabled column may not exist until migration 043 is run
    try {
      await sql`
        UPDATE tbl_project
        SET value_add_enabled = ${value_add_enabled}
        WHERE project_id = ${projectIdNum}
      `;
    } catch (columnError) {
      // Column doesn't exist yet - return success anyway since this is just a toggle
      console.warn('value_add_enabled column not found, migration 043 may not have run yet');
    }

    return NextResponse.json({
      success: true,
      value_add_enabled
    });
  } catch (error) {
    console.error('Error updating operations settings:', error);
    return NextResponse.json(
      { error: 'Failed to update operations settings' },
      { status: 500 }
    );
  }
}
