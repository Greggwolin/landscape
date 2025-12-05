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

    // Query doc_type counts
    const docTypeCounts = await sql`
      SELECT
        COALESCE(doc_type, 'general') AS doc_type,
        COUNT(*) as count
      FROM landscape.core_doc
      WHERE project_id = ${project}
        AND status NOT IN ('deleted', 'archived')
      GROUP BY COALESCE(doc_type, 'general')
      ORDER BY COALESCE(doc_type, 'general') ASC
    `;

    // Query smart filters with counts (best-effort; tags match is simplified to doc_type + project)
    const smartFilters = await sql`
      SELECT 
        f.filter_id,
        f.filter_name,
        f.doc_type,
        COALESCE(f.tags, ARRAY[]::text[]) AS tags,
        COALESCE(f.count_override, 0) AS count_override,
        COUNT(d.doc_id) AS matched_docs
      FROM landscape.core_doc_smartfilter f
      LEFT JOIN landscape.core_doc d
        ON d.project_id = ${project}
       AND d.doc_type = f.doc_type
      WHERE f.project_id = ${project}
         OR f.project_id IS NULL
      GROUP BY f.filter_id, f.filter_name, f.doc_type, f.tags, f.count_override
      ORDER BY f.filter_name ASC
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
        doc_type: row.doc_type || 'general',
        tags: row.tags || [],
        count: row.count_override || parseInt(row.matched_docs as string)
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
