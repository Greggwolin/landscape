/**
 * GET /api/dms/filters/counts
 * Fetch document type counts for accordion filters
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

    // Query doc_type counts
    const docTypeCounts = await sql`
      SELECT
        doc_type,
        COUNT(*) as count
      FROM landscape.core_doc
      WHERE project_id = ${parseInt(projectId)}
        AND status NOT IN ('deleted', 'archived')
      GROUP BY doc_type
      ORDER BY doc_type ASC
    `;

    return NextResponse.json({
      success: true,
      doc_type_counts: docTypeCounts.map(row => ({
        doc_type: row.doc_type || 'general',
        count: parseInt(row.count as string)
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
