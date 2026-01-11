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

    let suggestions: Array<{ tag_name: string; usage_count: number }> = [];

    try {
      // Call the database function for tag suggestions
      const rows = await sql`
        SELECT * FROM landscape.get_tag_suggestions(
          ${prefix},
          ${projectId ? parseInt(projectId) : null},
          ${workspaceId ? parseInt(workspaceId) : null},
          ${limit}
        )
      `;
      suggestions = rows.map(row => ({
        tag_name: row.tag_name,
        usage_count: row.usage_count
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (!message.includes('get_tag_suggestions')) {
        throw error;
      }

      const prefixFilter = prefix ? `${prefix}%` : null;
      const rows = await sql`
        SELECT
          tag_name,
          COUNT(*)::int AS usage_count
        FROM landscape.core_doc
        CROSS JOIN LATERAL jsonb_array_elements_text(profile_json->'tags') AS tag_name
        WHERE (profile_json ? 'tags')
          AND (${projectId ? sql`project_id = ${parseInt(projectId)}` : sql`FALSE`}
               OR ${workspaceId ? sql`workspace_id = ${parseInt(workspaceId)}` : sql`FALSE`})
          ${prefixFilter ? sql`AND tag_name ILIKE ${prefixFilter}` : sql``}
        GROUP BY tag_name
        ORDER BY usage_count DESC, tag_name ASC
        LIMIT ${limit}
      `;
      suggestions = rows.map(row => ({
        tag_name: row.tag_name,
        usage_count: row.usage_count
      }));
    }

    return NextResponse.json({
      success: true,
      suggestions
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
