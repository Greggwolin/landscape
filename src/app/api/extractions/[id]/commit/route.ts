// API Route: POST /api/extractions/[id]/commit
// Purpose: Commit extraction to database after review

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function POST(
  request: NextRequest,
  context: Params
) {
  try {
    const { id } = await context.params;
    const extractionId = parseInt(id);
    const body = await request.json();
    const { commit_notes } = body;

    // Get extraction with all corrections
    const extractionResults = await sql`
      SELECT
        eq.queue_id as id,
        eq.doc_id as document_id,
        eq.extract_type as extraction_type,
        eq.extracted_data as data,
        cd.project_id
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

    // Get all corrections for this extraction
    const correctionResults = await sql`
      SELECT field_path, user_value
      FROM landscape.ai_correction_log
      WHERE queue_id = ${extractionId}
      ORDER BY created_at DESC
    `;

    // Apply corrections to data
    const data = extraction.data as any;
    for (const correction of correctionResults) {
      const fieldPath = correction.field_path as string;
      const parts = fieldPath.split('.');

      // Navigate to the field and update it
      let current = data;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = correction.user_value;
    }

    // TODO: Commit the data to the appropriate tables based on extraction_type
    // For now, we'll just mark the extraction as committed
    // In production, this would insert into:
    // - landscape.tbl_rent_roll for rent_roll
    // - landscape.tbl_operating_expenses for operating_statement
    // - landscape.tbl_parcel for parcel_table

    // Update extraction status to 'committed'
    await sql`
      UPDATE landscape.dms_extract_queue
      SET
        review_status = 'committed',
        committed_at = NOW(),
        commit_notes = ${commit_notes || null}
      WHERE queue_id = ${extractionId}
    `;

    return NextResponse.json({
      success: true,
      message: 'Extraction committed successfully',
      extraction_id: extractionId,
    });

  } catch (error) {
    console.error('Error committing extraction:', error);
    return NextResponse.json(
      { error: 'Failed to commit extraction' },
      { status: 500 }
    );
  }
}
