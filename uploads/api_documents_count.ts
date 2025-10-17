// API Route: GET /api/documents/count?project_id={id}
// Purpose: Get document count for project (for Home page metric tile)

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id parameter required' },
        { status: 400 }
      );
    }

    const result = await sql`
      SELECT 
        COUNT(*) as document_count,
        COALESCE(SUM(file_size_bytes), 0) as total_size_bytes
      FROM landscape.dms_document
      WHERE project_id = ${projectId}
        AND status != 'deleted'
    `;

    return NextResponse.json({
      project_id: parseInt(projectId),
      document_count: parseInt(result.rows[0].document_count),
      total_size_bytes: parseInt(result.rows[0].total_size_bytes),
      total_size_mb: (parseInt(result.rows[0].total_size_bytes) / (1024 * 1024)).toFixed(2)
    });

  } catch (error) {
    console.error('Error fetching document count:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document count' },
      { status: 500 }
    );
  }
}
