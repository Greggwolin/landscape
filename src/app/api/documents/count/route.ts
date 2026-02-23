// API Route: GET /api/documents/count?project_id={id}
// Purpose: Get document count for project (for Home page metric tile)

import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('project_id')

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id parameter required' },
        { status: 400 }
      )
    }

    const result = await sql`
      SELECT
        COUNT(*) as document_count,
        COALESCE(SUM(file_size_bytes), 0) as total_size_bytes,
        MAX(created_at) as latest_created_at
      FROM landscape.core_doc
      WHERE project_id = ${projectId}::bigint
        AND status NOT IN ('archived', 'failed')
    `

    const documentCount = result[0]?.document_count ? parseInt(result[0].document_count as string) : 0
    const totalSizeBytes = result[0]?.total_size_bytes ? parseInt(result[0].total_size_bytes as string) : 0
    const latestCreatedAt = result[0]?.latest_created_at ? String(result[0].latest_created_at) : null

    return NextResponse.json({
      project_id: parseInt(projectId),
      document_count: documentCount,
      total_size_bytes: totalSizeBytes,
      total_size_mb: (totalSizeBytes / (1024 * 1024)).toFixed(2),
      latest_created_at: latestCreatedAt,
    })

  } catch (error) {
    console.error('Error fetching document count:', error)
    return NextResponse.json(
      { error: 'Failed to fetch document count' },
      { status: 500 }
    )
  }
}
