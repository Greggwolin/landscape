// API Route: GET /api/extractions/[id]/review
// Purpose: Get extraction details for review

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function GET(
  request: NextRequest,
  context: Params
) {
  try {
    const { id } = await context.params;
    const extractionId = parseInt(id);

    // Get extraction result
    const extractionResults = await sql`
      SELECT
        eq.queue_id as extraction_id,
        eq.doc_id as document_id,
        cd.doc_name as document_name,
        eq.extract_type as extraction_type,
        COALESCE(eq.overall_confidence, 0) as overall_confidence,
        eq.extracted_data as data,
        COALESCE(eq.review_status, 'pending') as review_status,
        eq.created_at as extracted_at
      FROM landscape.dms_extract_queue eq
      LEFT JOIN landscape.core_doc cd ON eq.doc_id = cd.doc_id
      WHERE eq.queue_id = ${extractionId}
    `;

    if (extractionResults.length === 0) {
      return NextResponse.json(
        { error: 'Extraction not found' },
        { status: 404 }
      );
    }

    const extraction = extractionResults[0];

    // Get warnings
    const warningResults = await sql`
      SELECT
        field_path,
        warning_type,
        severity,
        message,
        suggested_value
      FROM landscape.ai_extraction_warnings
      WHERE queue_id = ${extractionId}
      ORDER BY severity DESC, field_path
    `;

    const warnings = warningResults.map(row => ({
      field_path: row.field_path,
      warning_type: row.warning_type,
      severity: row.severity,
      message: row.message,
      suggested_value: row.suggested_value,
    }));

    // Get corrections already made
    const correctionResults = await sql`
      SELECT
        field_path,
        ai_value,
        user_value,
        correction_type,
        user_notes
      FROM landscape.ai_correction_log
      WHERE queue_id = ${extractionId}
      ORDER BY created_at DESC
    `;

    const corrections = correctionResults.reduce((acc, row) => {
      acc[row.field_path as string] = {
        ai_value: row.ai_value,
        user_value: row.user_value,
        correction_type: row.correction_type,
        user_notes: row.user_notes,
      };
      return acc;
    }, {} as Record<string, any>);

    // Parse the data JSON and apply corrections
    const data = extraction.data as any;

    return NextResponse.json({
      extraction_id: extraction.extraction_id,
      document_id: extraction.document_id,
      document_name: extraction.document_name,
      extraction_type: extraction.extraction_type,
      overall_confidence: parseFloat(extraction.overall_confidence as string),
      review_status: extraction.review_status,
      extracted_at: extraction.extracted_at,
      data,
      corrections,
      warnings,
    });

  } catch (error) {
    console.error('Error fetching extraction details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch extraction details' },
      { status: 500 }
    );
  }
}
