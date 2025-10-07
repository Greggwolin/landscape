import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/dms/db';
import { MoveDocumentZ } from '@/app/api/dms/folders/schema';
import { z } from 'zod';

/**
 * POST /api/dms/docs/:id/move
 * Move document to a folder and optionally apply inheritance
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const docId = parseInt(id);

    if (isNaN(docId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid document ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const data = MoveDocumentZ.parse(body);

    // Check document exists
    const docCheck = await sql`
      SELECT doc_id, profile_json
      FROM landscape.core_doc
      WHERE doc_id = ${docId}
    `;

    if (docCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    const currentProfile = docCheck.rows[0].profile_json || {};

    // If folder_id is null, remove from folder
    if (data.folder_id === null) {
      await sql`
        DELETE FROM landscape.core_doc_folder_link
        WHERE doc_id = ${docId}
      `;

      return NextResponse.json({
        success: true,
        doc_id: docId,
        folder_id: null,
        profile: currentProfile,
        inherited: false,
      });
    }

    // Validate folder exists
    const folderCheck = await sql`
      SELECT folder_id, default_profile
      FROM landscape.core_doc_folder
      WHERE folder_id = ${data.folder_id} AND is_active = true
    `;

    if (folderCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Folder not found' },
        { status: 404 }
      );
    }

    const folderProfile = folderCheck.rows[0].default_profile || {};

    // Apply inheritance if requested
    let newProfile = currentProfile;
    let inherited = false;

    if (data.apply_inheritance) {
      // Check if document has opted out of inheritance
      const optOut = currentProfile._inherit === false;

      if (!optOut) {
        // Call database function to apply inheritance
        // This also logs the change to ai_review_history
        const inheritResult = await sql`
          SELECT landscape.apply_folder_inheritance(
            ${docId}::INTEGER,
            ${data.folder_id}::INTEGER
          ) as new_profile
        `;

        newProfile = inheritResult.rows[0].new_profile;
        inherited = true;
      }
    }

    // Upsert folder link
    await sql`
      INSERT INTO landscape.core_doc_folder_link (doc_id, folder_id, inherited)
      VALUES (${docId}, ${data.folder_id}, ${inherited})
      ON CONFLICT (doc_id) DO UPDATE
      SET folder_id = ${data.folder_id},
          inherited = ${inherited},
          linked_at = NOW()
    `;

    return NextResponse.json({
      success: true,
      doc_id: docId,
      folder_id: data.folder_id,
      profile: newProfile,
      inherited,
      changes: inherited
        ? Object.keys(folderProfile).filter(key => !key.startsWith('_'))
        : [],
    });

  } catch (error) {
    console.error('Error moving document:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to move document',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/dms/docs/:id/move
 * Get current folder for document
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const docId = parseInt(id);

    if (isNaN(docId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid document ID' },
        { status: 400 }
      );
    }

    const result = await sql`
      SELECT
        fl.folder_id,
        fl.linked_at,
        fl.inherited,
        f.name as folder_name,
        f.path as folder_path,
        f.default_profile
      FROM landscape.core_doc_folder_link fl
      JOIN landscape.core_doc_folder f ON fl.folder_id = f.folder_id
      WHERE fl.doc_id = ${docId}
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        doc_id: docId,
        folder_id: null,
        folder_name: null,
        folder_path: null,
      });
    }

    const link = result.rows[0];

    return NextResponse.json({
      success: true,
      doc_id: docId,
      folder_id: link.folder_id,
      folder_name: link.folder_name,
      folder_path: link.folder_path,
      linked_at: link.linked_at.toISOString(),
      inherited: link.inherited,
      default_profile: link.default_profile,
    });

  } catch (error) {
    console.error('Error fetching document folder:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch document folder',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
