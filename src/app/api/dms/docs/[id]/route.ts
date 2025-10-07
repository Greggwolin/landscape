/**
 * GET /api/dms/docs/:id
 * Retrieve a single document by ID with system fields and profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/dms/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const docId = Number(id);

    if (isNaN(docId) || docId <= 0) {
      return NextResponse.json(
        { error: 'Invalid document ID' },
        { status: 400 }
      );
    }

    // Query document from database
    const docs = await sql`
      SELECT
        doc_id,
        project_id,
        workspace_id,
        phase_id,
        parcel_id,
        doc_name,
        doc_type,
        discipline,
        status,
        version_no,
        storage_uri,
        sha256_hash,
        mime_type,
        file_size_bytes,
        doc_date,
        contract_value,
        priority,
        profile_json,
        created_at,
        updated_at,
        created_by,
        updated_by
      FROM landscape.core_doc
      WHERE doc_id = ${docId}
      LIMIT 1
    `;

    if (!docs || docs.length === 0) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const doc = docs[0];

    // Separate system fields from profile
    const system = {
      doc_id: doc.doc_id,
      project_id: doc.project_id,
      workspace_id: doc.workspace_id,
      phase_id: doc.phase_id,
      parcel_id: doc.parcel_id,
      doc_name: doc.doc_name,
      doc_type: doc.doc_type,
      discipline: doc.discipline,
      status: doc.status,
      version_no: doc.version_no,
      storage_uri: doc.storage_uri,
      sha256_hash: doc.sha256_hash,
      mime_type: doc.mime_type,
      file_size_bytes: doc.file_size_bytes,
      doc_date: doc.doc_date,
      contract_value: doc.contract_value,
      priority: doc.priority,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
      created_by: doc.created_by,
      updated_by: doc.updated_by,
    };

    const profile = doc.profile_json || {};

    return NextResponse.json({
      system,
      profile,
    });

  } catch (error: any) {
    console.error('❌ GET /api/dms/docs/:id error:', error);

    return NextResponse.json(
      {
        error: 'Failed to retrieve document',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
