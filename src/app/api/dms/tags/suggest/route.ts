/**
 * GET /api/dms/tags/suggest
 * Tag autocomplete endpoint
 * Query params: ?prefix=env&project_id=123&limit=10
 * Returns: Array of {tag_name, usage_count}
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const prefix = searchParams.get('prefix') || '';
    const projectId = searchParams.get('project_id');
    const workspaceId = searchParams.get('workspace_id');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Validate required parameters
    if (!projectId && !workspaceId) {
      return NextResponse.json(
        { error: 'Either project_id or workspace_id is required' },
        { status: 400 }
      );
    }

    // Call the database function for tag suggestions
    const suggestions = await sql`
      SELECT * FROM landscape.get_tag_suggestions(
        ${prefix},
        ${projectId ? parseInt(projectId) : null},
        ${workspaceId ? parseInt(workspaceId) : null},
        ${limit}
      )
    `;

    return NextResponse.json({
      success: true,
      suggestions: suggestions.map(row => ({
        tag_name: row.tag_name,
        usage_count: row.usage_count
      }))
    });
  } catch (error) {
    console.error('Tag suggestion error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to fetch tag suggestions',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
