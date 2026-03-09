/**
 * DELETE /api/dms/documents/[id]/delete
 *
 * Deletes a document's backing file from UploadThing and soft-deletes the
 * core_doc record.  Used by the Ingestion Workbench abandon flow to clean
 * up orphaned uploads when the user cancels an intake session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { UTApi } from 'uploadthing/server';
import { sql } from '@/lib/db';

const utapi = new UTApi();

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const docId = parseInt(id, 10);
  if (isNaN(docId)) {
    return NextResponse.json({ error: 'Invalid doc ID' }, { status: 400 });
  }

  // 1. Fetch the storage_uri so we can extract the UT file key
  const rows = await sql`
    SELECT storage_uri FROM landscape.core_doc
    WHERE doc_id = ${docId} AND deleted_at IS NULL
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const storageUri: string = rows[0].storage_uri;

  // 2. Extract UploadThing file key from the URL
  //    Format: https://utfs.io/f/<fileKey>
  let fileKey: string | null = null;
  try {
    const url = new URL(storageUri);
    const pathParts = url.pathname.split('/');
    // pathname is typically /f/<key>
    const fIndex = pathParts.indexOf('f');
    if (fIndex >= 0 && fIndex < pathParts.length - 1) {
      fileKey = pathParts[fIndex + 1];
    }
  } catch {
    // If URL parsing fails, try treating as a raw key
    fileKey = storageUri;
  }

  // 3. Delete from UploadThing
  let utDeleted = false;
  if (fileKey) {
    try {
      await utapi.deleteFiles([fileKey]);
      utDeleted = true;
    } catch (err) {
      console.warn(`[DMS] UploadThing delete failed for key ${fileKey}:`, err);
      // Continue — still soft-delete the DB record even if UT fails
    }
  }

  // 4. Soft-delete the core_doc record
  await sql`
    UPDATE landscape.core_doc
    SET deleted_at = NOW()
    WHERE doc_id = ${docId} AND deleted_at IS NULL
  `;

  return NextResponse.json({
    success: true,
    doc_id: docId,
    ut_deleted: utDeleted,
    file_key: fileKey,
  });
}
