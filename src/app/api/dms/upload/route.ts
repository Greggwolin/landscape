/**
 * POST /api/dms/upload
 * Complete file upload endpoint for onboarding modal and other flows.
 *
 * 1. Uploads file to UploadThing
 * 2. Creates core_doc record in database
 * 3. Optionally triggers full extraction via Django backend
 *
 * Form data parameters:
 * - file: The file to upload (required)
 * - project_id: Project to associate document with (required)
 * - doc_type: Document type (default: 'Misc')
 * - workspace_id: DMS workspace (default: 1)
 * - run_full_extraction: If 'true', trigger comprehensive extraction (default: false)
 */

import { NextRequest, NextResponse } from 'next/server';
import { UTApi } from 'uploadthing/server';
import { sql } from '@/lib/db';

// Allow up to 60 seconds for large file uploads (up to 32MB)
export const maxDuration = 60;

const utapi = new UTApi();

const DJANGO_API_URL =
  process.env.DJANGO_API_URL || process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

// Generate a SHA256 hash for deduplication
async function generateSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const projectIdStr = formData.get('project_id') as string | null;
    const docType = (formData.get('doc_type') as string) || 'Misc';
    const workspaceIdStr = formData.get('workspace_id') as string | null;
    const runFullExtraction = formData.get('run_full_extraction') === 'true';

    // Validate required fields
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!projectIdStr) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }

    const projectId = parseInt(projectIdStr, 10);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project_id' }, { status: 400 });
    }

    const workspaceId = workspaceIdStr ? parseInt(workspaceIdStr, 10) : 1;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(file.type) && !file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}` },
        { status: 400 }
      );
    }

    // Generate SHA256 for deduplication
    const sha256 = await generateSha256(file);

    // Check for duplicate document
    const existing = await sql`
      SELECT doc_id, version_no, doc_name, status, created_at
      FROM landscape.core_doc
      WHERE sha256_hash = ${sha256}
        AND project_id = ${projectId}
      LIMIT 1
    `;

    if (existing.length > 0) {
      console.log(`📦 Duplicate detected: sha256=${sha256}, project=${projectId}`);
      return NextResponse.json({
        success: true,
        duplicate: true,
        doc_id: existing[0].doc_id,
        doc: existing[0],
        message: 'Document already exists in project',
      });
    }

    // Upload to UploadThing
    console.log(`📤 Uploading file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    const uploadResponse = await utapi.uploadFiles(file);

    if (uploadResponse.error) {
      console.error('UploadThing error:', uploadResponse.error);
      throw new Error(uploadResponse.error.message);
    }

    const storageUri = uploadResponse.data.url;
    console.log(`✅ Uploaded to UploadThing: ${storageUri}`);

    // Create core_doc record
    // Note: created_by/updated_by are bigint (user IDs) - use NULL for system operations
    const inserted = await sql`
      INSERT INTO landscape.core_doc (
        project_id,
        workspace_id,
        doc_name,
        doc_type,
        status,
        version_no,
        storage_uri,
        sha256_hash,
        mime_type,
        file_size_bytes,
        profile_json
      ) VALUES (
        ${projectId},
        ${workspaceId},
        ${file.name},
        ${docType},
        'draft',
        1,
        ${storageUri},
        ${sha256},
        ${file.type},
        ${file.size},
        ${'{}'}::jsonb
      )
      RETURNING doc_id, version_no, doc_name, doc_type, status, created_at
    `;

    const doc = inserted[0];
    console.log(`✅ Created core_doc: doc_id=${doc.doc_id}, name=${doc.doc_name}`);

    // Create AI ingestion history record
    await sql`
      INSERT INTO landscape.ai_ingestion_history (
        project_id,
        package_name,
        documents,
        created_by
      ) VALUES (
        ${projectId},
        'new_project_modal',
        ${JSON.stringify({ doc_ids: [doc.doc_id], doc_names: [doc.doc_name] })}::jsonb,
        'system'
      )
    `;

    // Response object
    const response: {
      success: boolean;
      duplicate: boolean;
      doc_id: number;
      doc: typeof doc;
      storage_uri: string;
      extraction?: {
        triggered: boolean;
        status: string;
        error?: string;
        fields_staged?: number;
        auto_approved?: number;
        fields_applied?: number;
      };
    } = {
      success: true,
      duplicate: false,
      doc_id: doc.doc_id,
      doc,
      storage_uri: storageUri,
    };

    // Trigger full extraction if requested
    if (runFullExtraction) {
      console.log(`🔄 Triggering full extraction for doc_id=${doc.doc_id}`);
      response.extraction = { triggered: true, status: 'pending' };

      try {
        // Step 1: Process document (text extraction, chunking, embeddings)
        const processResponse = await fetch(
          `${DJANGO_API_URL}/api/knowledge/documents/${doc.doc_id}/process/`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (!processResponse.ok) {
          const errorText = await processResponse.text();
          console.error(`❌ Document processing failed: ${processResponse.status}`, errorText);
          response.extraction.status = 'process_failed';
          response.extraction.error = `Processing failed: ${processResponse.status}`;
        } else {
          const processResult = await processResponse.json();
          console.log(`✅ Document processed: ${processResult.embeddings_created || 0} embeddings`);

          // Step 2: Run batched extraction
          const extractResponse = await fetch(
            `${DJANGO_API_URL}/api/knowledge/documents/${doc.doc_id}/extract-batched/`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                project_id: projectId,
                property_type: 'multifamily',
                batches: ['core_property', 'financials', 'deal_market', 'rent_roll', 'opex'],
              }),
            }
          );

          if (extractResponse.ok) {
            const extractResult = await extractResponse.json();
            console.log(`✅ Extraction complete: ${extractResult.total_staged || 0} fields staged`);
            response.extraction.status = 'complete';
            response.extraction.fields_staged = extractResult.total_staged || 0;

            // Step 3: Auto-approve high-confidence extractions (>=0.85) to write to production tables
            // This ensures data shows up in Property/Operations tabs immediately
            if (extractResult.total_staged > 0) {
              console.log(`🔄 Auto-approving high-confidence extractions for project ${projectId}`);
              try {
                const approveResponse = await fetch(
                  `${DJANGO_API_URL}/api/knowledge/projects/${projectId}/extractions/approve-high-confidence/`,
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      confidence_threshold: 0.85,
                    }),
                  }
                );

                if (approveResponse.ok) {
                  const approveResult = await approveResponse.json();
                  console.log(`✅ Auto-approved ${approveResult.approved || 0} extractions, applied ${approveResult.applied_to_model || 0} to model`);
                  response.extraction.auto_approved = approveResult.approved || 0;
                  response.extraction.fields_applied = approveResult.applied_to_model || 0;
                } else {
                  const errorText = await approveResponse.text();
                  console.error(`⚠️ Auto-approve failed (non-fatal): ${approveResponse.status}`, errorText);
                }
              } catch (approveError) {
                console.error('⚠️ Auto-approve error (non-fatal):', approveError);
              }
            }
          } else {
            const errorText = await extractResponse.text();
            console.error(`❌ Extraction failed: ${extractResponse.status}`, errorText);
            response.extraction.status = 'extract_failed';
            response.extraction.error = `Extraction failed: ${extractResponse.status}`;
          }
        }
      } catch (extractionError) {
        console.error('❌ Extraction error:', extractionError);
        response.extraction.status = 'error';
        response.extraction.error = extractionError instanceof Error
          ? extractionError.message
          : 'Unknown extraction error';
      }
    }

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('❌ Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
