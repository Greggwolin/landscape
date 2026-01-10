/**
 * POST /api/dms/docs
 * Document creation endpoint with duplicate detection and AI ingestion tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { CreateDocZ } from './schema';
import { z } from 'zod';

/**
 * POST /api/dms/docs
 * Create a new document record with duplicate detection and tag tracking
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('[/api/dms/docs] Received:', JSON.stringify(body, null, 2));

    // Validate request body
    const { system, profile = {}, ai } = CreateDocZ.parse(body);

    // Validate doc_type against template's doc_type_options
    const template = await sql`
      SELECT doc_type_options
      FROM landscape.dms_templates
      WHERE (project_id = ${system.project_id} OR workspace_id = ${system.workspace_id ?? null})
        AND is_default = true
      LIMIT 1
    `;

    if (template.length > 0 && template[0].doc_type_options) {
      const validDocTypes = template[0].doc_type_options;
      const docType = system.doc_type ?? 'general';

      if (!validDocTypes.includes(docType)) {
        return NextResponse.json(
          {
            error: 'Invalid doc_type',
            details: `doc_type "${docType}" is not allowed. Valid options: ${validDocTypes.join(', ')}`,
            valid_doc_types: validDocTypes
          },
          { status: 400 }
        );
      }
    }

    // Check for existing document with same sha256 + project_id (dedupe)
    const existing = await sql`
      SELECT doc_id, version_no, doc_name, status, created_at
      FROM landscape.core_doc
      WHERE sha256_hash = ${system.sha256}
        AND project_id = ${system.project_id}
      LIMIT 1
    `;

    if (existing.length > 0) {
      console.log(`📦 Duplicate detected: sha256=${system.sha256}, project=${system.project_id}`);
      return NextResponse.json(
        {
          success: true,
          duplicate: true,
          doc: existing[0],
        },
        { status: 200 }
      );
    }

    // Insert document into core_doc
    const inserted = await sql`
      INSERT INTO landscape.core_doc (
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
        profile_json,
        created_by,
        updated_by
      ) VALUES (
        ${system.project_id},
        ${system.workspace_id ?? null},
        ${system.phase_id ?? null},
        ${system.parcel_id ?? null},
        ${system.doc_name},
        ${system.doc_type ?? 'general'},
        ${system.discipline ?? null},
        ${system.status ?? 'draft'},
        ${system.version_no ?? 1},
        ${system.storage_uri},
        ${system.sha256},
        ${system.mime_type ?? null},
        ${system.file_size_bytes ?? null},
        ${JSON.stringify(profile)}::jsonb,
        ${system.uploaded_by ?? null},
        ${system.uploaded_by ?? null}
      )
      RETURNING doc_id, version_no, doc_name, status, created_at
    `;

    const doc = inserted[0];

    console.log(`✅ Created document: doc_id=${doc.doc_id}, name=${doc.doc_name}`);

    // Increment tag usage for all tags in profile_json.tags[]
    if (profile.tags && Array.isArray(profile.tags) && profile.tags.length > 0) {
      for (const tag of profile.tags) {
        try {
          await sql`
            SELECT landscape.increment_tag_usage(
              ${tag},
              ${system.project_id},
              ${system.workspace_id ?? null}
            )
          `;
        } catch (tagError) {
          console.warn(`⚠️ Failed to increment tag usage for "${tag}":`, tagError);
          // Continue processing other tags even if one fails
        }
      }
      console.log(`🏷️ Incremented usage for ${profile.tags.length} tag(s)`);
    }

    // Create AI ingestion history record
    await sql`
      INSERT INTO landscape.ai_ingestion_history (
        project_id,
        package_name,
        documents,
        ai_analysis,
        created_by
      ) VALUES (
        ${system.project_id},
        ${ai?.source ?? 'upload'},
        ${JSON.stringify({ doc_ids: [doc.doc_id], doc_names: [doc.doc_name] })}::jsonb,
        ${ai?.raw ? JSON.stringify(ai.raw) : null}::jsonb,
        ${system.uploaded_by ? system.uploaded_by.toString() : 'system'}
      )
    `;

    console.log(`📝 Created ingestion history for doc_id=${doc.doc_id}`);

    // Queue document for extraction (creates DMSExtractQueue job)
    // Background worker will process it and create assertions/embeddings
    let processing: {
      status: string;
      queue_id: number | null;
      error: string | null;
    } = {
      status: 'pending',
      queue_id: null,
      error: null,
    };

    try {
      // Determine extract type based on doc_type
      const extractType = system.doc_type?.toLowerCase().includes('rent') ? 'rent_roll' : 'general';

      // Insert into DMSExtractQueue directly
      const queueResult = await sql`
        INSERT INTO landscape.dms_extract_queue (
          doc_id,
          extract_type,
          priority,
          status,
          created_at
        ) VALUES (
          ${parseInt(doc.doc_id)},
          ${extractType},
          5,
          'pending',
          NOW()
        )
        RETURNING queue_id, status
      `;

      if (queueResult.length > 0) {
        processing = {
          status: 'queued',
          queue_id: queueResult[0].queue_id,
          error: null,
        };
        console.log(`🔄 Queued document ${doc.doc_id} for extraction (queue_id=${processing.queue_id})`);
      }
    } catch (queueError) {
      // Don't fail the upload if queueing fails - document is still created
      processing.status = 'queue_failed';
      processing.error = queueError instanceof Error ? queueError.message : 'Failed to queue for extraction';
      console.warn(`⚠️ Failed to queue document ${doc.doc_id} for extraction:`, processing.error);
    }

    return NextResponse.json(
      {
        success: true,
        duplicate: false,
        doc,
        processing,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ Document creation error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    // Handle other errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to create document',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/dms/docs
 * List documents with filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const projectId = searchParams.get('project_id');
    const workspaceId = searchParams.get('workspace_id');
    const docType = searchParams.get('doc_type');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') ?? '50');
    const offset = parseInt(searchParams.get('offset') ?? '0');

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    // Build query with filters (use conditional WHERE clauses)
    const docs = await sql`
      SELECT
        d.doc_id,
        d.project_id,
        d.workspace_id,
        d.phase_id,
        d.parcel_id,
        d.doc_name,
        d.doc_type,
        d.discipline,
        d.status,
        d.version_no,
        d.storage_uri,
        d.profile_json,
        d.created_at,
        d.updated_at,
        p.project_name
      FROM landscape.core_doc d
      LEFT JOIN landscape.tbl_project p ON d.project_id = p.project_id
      WHERE d.project_id = ${parseInt(projectId)}
        ${workspaceId ? sql`AND d.workspace_id = ${parseInt(workspaceId)}` : sql``}
        ${docType ? sql`AND d.doc_type = ${docType}` : sql``}
        ${status ? sql`AND d.status = ${status}` : sql``}
      ORDER BY d.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    return NextResponse.json({
      success: true,
      docs,
      pagination: {
        limit,
        offset,
        count: docs.length,
      },
    });
  } catch (error) {
    console.error('❌ Document list error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to fetch documents',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
