/**
 * POST /api/projects/[projectId]/dms/update-doc-type
 * Updates the doc_type on a core_doc record.
 * Used by the Knowledge Intake Modal after user selects a doc type.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

import { requireAuth, requireProjectAccess } from '@/lib/api/requireAuth';
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId: __projectIdParam } = await params;
  const __auth = await requireProjectAccess(req, __projectIdParam);
  if (__auth instanceof NextResponse) return __auth;

  try {
    const { projectId } = await params;
    const { doc_id, doc_type } = await req.json();

    if (!doc_id || !doc_type) {
      return NextResponse.json(
        { error: 'doc_id and doc_type are required' },
        { status: 400 }
      );
    }

    await sql`
      UPDATE landscape.core_doc
      SET doc_type = ${doc_type},
          updated_at = NOW()
      WHERE doc_id = ${parseInt(doc_id)}
        AND project_id = ${parseInt(projectId)}
        AND deleted_at IS NULL
    `;

    return NextResponse.json({ success: true, doc_id, doc_type });
  } catch (error) {
    console.error('[update-doc-type] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update doc type' },
      { status: 500 }
    );
  }
}
