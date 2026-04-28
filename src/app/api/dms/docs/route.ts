/**
 * POST /api/dms/docs
 * Document creation endpoint with duplicate detection and AI ingestion tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { CreateDocZ } from './schema';
import { z } from 'zod';
import { getUserFromRequest, userOwnsProject } from '@/lib/auth';

const DJANGO_API_URL =
  process.env.DJANGO_API_URL || process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

/**
 * POST /api/dms/docs
 * Create a new document record with duplicate detection and tag tracking
 */
export async function POST(req: NextRequest) {
 try {
  try {
    const body = await req.json();
    console.log('[/api/dms/docs] Received:', JSON.stringify(body, null, 2));

    // Validate request body
    const { system, profile = {}, ai } = CreateDocZ.parse(body);

    // Auth: identify uploader and verify access (project OR thread)
    const requestUser = await getUserFromRequest(req);
    if (!requestUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Branch by ownership target:
    //   - system.project_id present                → project-scoped upload (legacy path)
    //   - system.thread_id present, thread has    → auto-route to that project (promoted thread)
    //     project_id
    //   - system.thread_id present, thread is      → unassigned upload (chat canvas)
    //     unassigned (project_id IS NULL)
    // Schema superRefine guarantees at least one of project_id / thread_id is supplied.
    let resolvedProjectId: number | null = system.project_id ?? null;
    const resolvedThreadId: string | null = system.thread_id ?? null;

    if (!resolvedProjectId && resolvedThreadId) {
      // Look up the thread; if it's been promoted to a project, transparently
      // route the upload to that project instead of rejecting.
      const [threadRow] = await sql`
        SELECT id, project_id
          FROM landscape.landscaper_chat_thread
         WHERE id = ${resolvedThreadId}::uuid
         LIMIT 1
      `;
      if (!threadRow) {
        return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
      }
      if (threadRow.project_id !== null) {
        // Promoted thread — switch to project-scoped upload path. Keep
        // thread_id on the row too so the linkage is preserved.
        resolvedProjectId = Number(threadRow.project_id);
      }
    }

    const isThreadScoped = !resolvedProjectId && !!resolvedThreadId;

    if (resolvedProjectId) {
      const ownsProject = await userOwnsProject(requestUser.userId, resolvedProjectId);
      if (!ownsProject) {
        return NextResponse.json({ error: 'You do not have access to this project' }, { status: 403 });
      }
    }
    // Pure thread path needs no further auth gate at alpha — thread existence
    // was confirmed above. Strict per-user thread ownership check is a follow-up.

    const docType = system.doc_type ?? 'general';

    // doc_type validation against dms_project_doc_types runs ONLY for
    // project-scoped uploads. Thread-scoped uploads skip it — there's no
    // project to scope the doc-type catalog to until promotion.
    if (resolvedProjectId) {
      const projectDocTypes = await sql`
        SELECT doc_type_name
        FROM landscape.dms_project_doc_types
        WHERE project_id = ${resolvedProjectId}
      `;

      if (projectDocTypes.length > 0) {
        const validSet = new Set(projectDocTypes.map(row => row.doc_type_name.toLowerCase()));
        if (!validSet.has(docType.toLowerCase())) {
          await sql`
            INSERT INTO landscape.dms_project_doc_types (project_id, doc_type_name, display_order, is_from_template)
            VALUES (
              ${resolvedProjectId},
              ${docType},
              (SELECT COALESCE(MAX(display_order), 0) + 1 FROM landscape.dms_project_doc_types WHERE project_id = ${resolvedProjectId}),
              FALSE
            )
            ON CONFLICT (project_id, doc_type_name) DO NOTHING
          `;
        }
      } else {
        // Fallback: if project doc types aren't seeded yet, use template options
        const template = await sql`
          SELECT doc_type_options
          FROM landscape.dms_templates
          WHERE (project_id = ${resolvedProjectId} OR workspace_id = ${system.workspace_id ?? null})
            AND is_default = true
          LIMIT 1
        `;

        if (template.length > 0 && template[0].doc_type_options) {
          const validDocTypes = template[0].doc_type_options;
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
        } else {
          await sql`
            INSERT INTO landscape.dms_project_doc_types (project_id, doc_type_name, display_order, is_from_template)
            VALUES (
              ${resolvedProjectId},
              ${docType},
              (SELECT COALESCE(MAX(display_order), 0) + 1 FROM landscape.dms_project_doc_types WHERE project_id = ${resolvedProjectId}),
              FALSE
            )
            ON CONFLICT (project_id, doc_type_name) DO NOTHING
          `;
        }
      }
    }

    // Collision detection scoped to whichever ownership applies.
    // Project: dedupe within the project. Thread: dedupe within the thread.
    const [hashMatch] = system.sha256
      ? (isThreadScoped
        ? await sql`
          SELECT doc_id, version_no, doc_name, status, created_at, doc_type, file_size_bytes, mime_type
          FROM landscape.core_doc
          WHERE sha256_hash = ${system.sha256}
            AND thread_id = ${resolvedThreadId!}::uuid
            AND deleted_at IS NULL
          LIMIT 1
        `
        : await sql`
          SELECT doc_id, version_no, doc_name, status, created_at, doc_type, file_size_bytes, mime_type
          FROM landscape.core_doc
          WHERE sha256_hash = ${system.sha256}
            AND project_id = ${resolvedProjectId}
            AND deleted_at IS NULL
          LIMIT 1
        `)
      : [];

    const [filenameMatch] = isThreadScoped
      ? await sql`
        SELECT doc_id, version_no, doc_name, status, created_at, doc_type, file_size_bytes, mime_type
        FROM landscape.core_doc
        WHERE LOWER(doc_name) = LOWER(${system.doc_name})
          AND thread_id = ${resolvedThreadId!}::uuid
          AND deleted_at IS NULL
        LIMIT 1
      `
      : await sql`
        SELECT doc_id, version_no, doc_name, status, created_at, doc_type, file_size_bytes, mime_type
        FROM landscape.core_doc
        WHERE LOWER(doc_name) = LOWER(${system.doc_name})
          AND project_id = ${resolvedProjectId}
          AND deleted_at IS NULL
        LIMIT 1
      `;

    if (hashMatch || filenameMatch) {
      let matchType: 'filename' | 'content' | 'both' = 'filename';
      let matchedDoc = filenameMatch;
      if (hashMatch && filenameMatch && hashMatch.doc_id === filenameMatch.doc_id) {
        matchType = 'both';
        matchedDoc = hashMatch;
      } else if (hashMatch) {
        matchType = 'content';
        matchedDoc = hashMatch;
      }

      let factsExtracted = 0;
      let embeddings = 0;
      try {
        const [factsRow] = await sql`
          SELECT COUNT(*)::int as count
          FROM landscape.doc_extracted_facts
          WHERE doc_id = ${matchedDoc.doc_id}
            AND superseded_at IS NULL
        `;
        factsExtracted = factsRow?.count ?? 0;
      } catch {
        factsExtracted = 0;
      }

      try {
        const [embeddingsRow] = await sql`
          SELECT COUNT(*)::int as count
          FROM landscape.knowledge_embeddings
          WHERE source_type IN ('document', 'document_chunk')
            AND source_id = ${matchedDoc.doc_id}
            AND superseded_by_version IS NULL
        `;
        embeddings = embeddingsRow?.count ?? 0;
      } catch {
        embeddings = 0;
      }

      console.log(
        `📦 Collision detected (${matchType}): doc_id=${matchedDoc.doc_id}, project=${resolvedProjectId}`
      );

      return NextResponse.json(
        {
          success: true,
          collision: true,
          duplicate: true,
          match_type: matchType,
          existing_doc: {
            doc_id: matchedDoc.doc_id,
            filename: matchedDoc.doc_name,
            version_number: matchedDoc.version_no,
            uploaded_at: matchedDoc.created_at,
            doc_type: matchedDoc.doc_type,
            file_size_bytes: matchedDoc.file_size_bytes,
            mime_type: matchedDoc.mime_type,
            extraction_summary: {
              facts_extracted: factsExtracted,
              embeddings,
            },
          },
        },
        { status: 200 }
      );
    }

    // Insert document into core_doc
    // When intent=structured_ingestion, hide from DMS until commit by setting
    // deleted_at. commit_staging will flip deleted_at → NULL on success.
    const hideUntilCommit = system.intent === 'structured_ingestion';

    const inserted = await sql`
      INSERT INTO landscape.core_doc (
        project_id,
        thread_id,
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
        updated_by,
        deleted_at
      ) VALUES (
        ${resolvedProjectId},
        ${resolvedThreadId}::uuid,
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
        ${requestUser.userId},
        ${requestUser.userId},
        ${hideUntilCommit ? new Date().toISOString() : null}
      )
      RETURNING doc_id, version_no, doc_name, status, created_at
    `;

    const doc = inserted[0];

    console.log(`✅ Created document: doc_id=${doc.doc_id}, name=${doc.doc_name}`);

    // Increment tag usage for all tags in profile_json.tags[].
    // Tag usage is scoped to project_id; skip for thread-scoped uploads
    // (tags will be re-evaluated when the thread is promoted to a project).
    if (resolvedProjectId && profile.tags && Array.isArray(profile.tags) && profile.tags.length > 0) {
      for (const tag of profile.tags) {
        try {
          await sql`
            SELECT landscape.increment_tag_usage(
              ${tag},
              ${resolvedProjectId},
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
        ${resolvedProjectId},
        ${ai?.source ?? 'upload'},
        ${JSON.stringify({ doc_ids: [doc.doc_id], doc_names: [doc.doc_name] })}::jsonb,
        ${ai?.raw ? JSON.stringify(ai.raw) : null}::jsonb,
        ${system.uploaded_by ? system.uploaded_by.toString() : 'system'}
      )
    `;

    console.log(`📝 Created ingestion history for doc_id=${doc.doc_id}`);

    // ── Post-upload extraction routing ────────────────────────────────────
    //
    // Two pipelines exist:
    //   1. Legacy dms_extract_queue → manual `process_extractions` worker → dms_assertion
    //   2. Knowledge extraction service → ai_extraction_staging (Workbench)
    //
    // When intent=structured_ingestion the IntakeChoiceModal fires
    // POST /api/knowledge/documents/{doc_id}/extract-batched/ separately,
    // so we skip the legacy queue insert to avoid orphaned "pending" rows.
    //
    // RAG processing (text extraction → chunking → embeddings) runs for ALL
    // intents since it feeds the knowledge base, not the workbench.

    const intent = system.intent; // 'structured_ingestion' | 'global_intelligence' | 'dms_only' | undefined

    let processing: {
      status: string;
      queue_id: number | null;
      error: string | null;
    } = {
      status: intent === 'structured_ingestion' ? 'deferred_to_workbench' : 'pending',
      queue_id: null,
      error: null,
    };

    try {
      // Skip legacy extract queue for structured_ingestion (Workbench handles it)
      // and knowledge intents (RAG pipeline handles them — no field extraction needed).
      const skipQueue = intent === 'structured_ingestion'
        || intent === 'project_knowledge'
        || intent === 'platform_knowledge';
      if (!skipQueue) {
        const extractType = system.doc_type?.toLowerCase().includes('rent') ? 'rent_roll' : 'general';

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
      } else {
        console.log(`🧩 Skipping dms_extract_queue for doc ${doc.doc_id} — routed to Workbench pipeline`);
      }

      // Trigger RAG processing (text extraction → chunking → embeddings)
      // Runs for ALL intents — feeds knowledge base, not the workbench.
      // Fire-and-forget: runs in parallel with the response.
      fetch(`${DJANGO_API_URL}/api/knowledge/documents/${doc.doc_id}/process/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
        .then(async (res) => {
          if (res.ok) {
            const result = await res.json();
            console.log(`✅ RAG processing complete for doc_id=${doc.doc_id}: ${result.embeddings_created || 0} embeddings created`);
          } else {
            console.warn(`⚠️ RAG processing failed for doc_id=${doc.doc_id}: ${res.status} ${res.statusText}`);
          }
        })
        .catch((processError) => {
          console.error(`⚠️ RAG processing error for doc_id=${doc.doc_id}:`, processError);
        });

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
 } catch (outerError) {
    // Safety net: ensure we NEVER return an empty {} response
    console.error('❌ Unhandled outer error in POST /api/dms/docs:', outerError);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: outerError instanceof Error ? outerError.message : 'Unexpected failure',
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
        d.media_scan_status,
        d.media_scan_json,
        p.project_name
      FROM landscape.core_doc d
      LEFT JOIN landscape.tbl_project p ON d.project_id = p.project_id
      WHERE d.project_id = ${parseInt(projectId)}
        AND d.deleted_at IS NULL
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
