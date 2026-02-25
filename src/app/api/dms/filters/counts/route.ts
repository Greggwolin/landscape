/**
 * GET /api/dms/filters/counts
 * Fetch document type counts and smart filters for doc type panel
 * Query params: ?project_id=123
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    const project = parseInt(projectId);

    // Query doc_type counts (latest version only)
    const docTypeCounts = await sql`
      WITH latest_docs AS (
        SELECT d.doc_id, COALESCE(d.doc_type, 'general') AS doc_type
        FROM landscape.core_doc d
        JOIN (
          SELECT
            COALESCE(parent_doc_id, doc_id) AS root_id,
            MAX(COALESCE(version_no, 1)) AS max_version
          FROM landscape.core_doc
          WHERE project_id = ${project}
            AND status NOT IN ('deleted', 'archived')
            AND deleted_at IS NULL
          GROUP BY COALESCE(parent_doc_id, doc_id)
        ) v
          ON v.root_id = COALESCE(d.parent_doc_id, d.doc_id)
         AND COALESCE(d.version_no, 1) = v.max_version
        WHERE d.project_id = ${project}
          AND d.status NOT IN ('deleted', 'archived')
          AND d.deleted_at IS NULL
      )
      SELECT doc_type, COUNT(*) as count
      FROM latest_docs
      GROUP BY doc_type
      ORDER BY doc_type ASC
    `;

    // Query smart filters (active only)
    const smartFilters = await sql`
      SELECT
        f.filter_id,
        f.name AS filter_name,
        f.query
      FROM landscape.core_doc_smartfilter f
      WHERE f.is_active = true
      ORDER BY f.name ASC
    `;

    return NextResponse.json({
      success: true,
      doc_type_counts: docTypeCounts.map(row => ({
        doc_type: row.doc_type || 'general',
        count: parseInt(row.count as string)
      })),
      smart_filters: smartFilters.map(row => ({
        filter_id: row.filter_id,
        filter_name: row.filter_name,
        query: row.query
      }))
    });
  } catch (error) {
    console.error('Error fetching filter counts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to fetch filter counts',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
