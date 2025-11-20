// API Route: GET /api/extractions/queue
// Purpose: Get list of extractions for review queue

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build the status filter
    let statusFilter = sql``;
    if (status === 'all') {
      statusFilter = sql``;
    } else if (status === 'pending') {
      statusFilter = sql`AND eq.review_status = 'pending'`;
    } else {
      statusFilter = sql`AND eq.review_status = ${status}`;
    }

    // Query extractions with aggregated correction counts
    const results = await sql`
      SELECT
        eq.queue_id as extraction_id,
        eq.doc_id as document_id,
        cd.doc_name as document_name,
        cd.doc_type as document_type,
        eq.extract_type as extraction_type,
        COALESCE(eq.overall_confidence, 0) as overall_confidence,
        COALESCE(eq.review_status, 'pending') as review_status,
        eq.created_at as extracted_at,
        COALESCE(
          (cd.profile_json->>'page_count')::int,
          0
        ) as page_count,
        COALESCE(correction_counts.correction_count, 0) as correction_count,
        COALESCE(warning_counts.error_count, 0) as error_count,
        COALESCE(warning_counts.warning_count, 0) as warning_count
      FROM landscape.dms_extract_queue eq
      LEFT JOIN landscape.core_doc cd ON eq.doc_id = cd.doc_id
      LEFT JOIN (
        SELECT
          queue_id,
          COUNT(*) as correction_count
        FROM landscape.ai_correction_log
        GROUP BY queue_id
      ) correction_counts ON eq.queue_id = correction_counts.queue_id
      LEFT JOIN (
        SELECT
          queue_id,
          COUNT(CASE WHEN severity = 'error' THEN 1 END) as error_count,
          COUNT(CASE WHEN severity = 'warning' THEN 1 END) as warning_count
        FROM landscape.ai_extraction_warnings
        GROUP BY queue_id
      ) warning_counts ON eq.queue_id = warning_counts.queue_id
      WHERE eq.status = 'completed'
      ${statusFilter}
      ORDER BY eq.created_at DESC
      LIMIT ${limit}
    `;

    const queue = results.map(row => ({
      extraction_id: row.extraction_id,
      document_id: row.document_id,
      document_name: row.document_name,
      document_type: row.document_type,
      extraction_type: row.extraction_type,
      overall_confidence: parseFloat(row.overall_confidence as string),
      review_status: row.review_status,
      correction_count: parseInt(row.correction_count as string),
      extracted_at: row.extracted_at,
      page_count: row.page_count,
      error_count: parseInt(row.error_count as string),
      warning_count: parseInt(row.warning_count as string),
    }));

    return NextResponse.json({ queue });

  } catch (error) {
    console.error('Error fetching extraction queue:', error);
    return NextResponse.json(
      { error: 'Failed to fetch extraction queue' },
      { status: 500 }
    );
  }
}
