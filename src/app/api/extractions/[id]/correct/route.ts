// API Route: POST /api/extractions/[id]/correct
// Purpose: Log a correction for an extraction field

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

    const {
      field_path,
      old_value,
      new_value,
      correction_type,
      notes,
      page_number,
      source_quote,
      ai_confidence,
    } = body;

    // Validate required fields
    if (!field_path || new_value === undefined) {
      return NextResponse.json(
        { error: 'field_path and new_value are required' },
        { status: 400 }
      );
    }

    // Insert correction log
    await sql`
      INSERT INTO landscape.ai_correction_log (
        queue_id,
        field_path,
        ai_value,
        user_value,
        ai_confidence,
        correction_type,
        page_number,
        source_quote,
        user_notes,
        created_at
      ) VALUES (
        ${extractionId},
        ${field_path},
        ${old_value},
        ${new_value},
        ${ai_confidence || null},
        ${correction_type || 'value_wrong'},
        ${page_number || null},
        ${source_quote || null},
        ${notes || null},
        NOW()
      )
    `;

    // Update extraction status to 'in_review' if it was 'pending'
    await sql`
      UPDATE landscape.dms_extract_queue
      SET review_status = 'in_review'
      WHERE queue_id = ${extractionId}
        AND COALESCE(review_status, 'pending') = 'pending'
    `;

    return NextResponse.json({
      success: true,
      message: 'Correction logged successfully',
    });

  } catch (error) {
    console.error('Error logging correction:', error);
    return NextResponse.json(
      { error: 'Failed to log correction' },
      { status: 500 }
    );
  }
}
