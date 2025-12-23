/**
 * Project Documents API
 *
 * GET /api/projects/[projectId]/documents
 *
 * Returns all documents for a project with their processing status
 * and embedding counts. Used by the workspace and Greenhouse components.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

interface DocumentWithStatus {
  doc_id: number;
  doc_name: string;
  doc_type: string;
  status: string;
  storage_uri: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  created_at: Date;
  updated_at: Date;
  embedding_count: number;
  has_content: boolean;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { searchParams } = new URL(request.url);
    const docType = searchParams.get('doc_type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const includeContent = searchParams.get('include_content') === 'true';

    // Query documents with embedding counts via subquery
    const docs = await sql<DocumentWithStatus[]>`
      SELECT
        d.doc_id,
        d.doc_name,
        d.doc_type,
        d.status,
        d.storage_uri,
        d.mime_type,
        d.file_size_bytes,
        d.created_at,
        d.updated_at,
        COALESCE(e.embedding_count, 0)::int as embedding_count,
        COALESCE(e.embedding_count, 0) > 0 as has_content
      FROM landscape.core_doc d
      LEFT JOIN (
        SELECT source_id, COUNT(*) as embedding_count
        FROM landscape.knowledge_embeddings
        WHERE source_type = 'document_chunk'
        GROUP BY source_id
      ) e ON d.doc_id = e.source_id
      WHERE d.project_id = ${projectId}::bigint
        ${docType ? sql`AND d.doc_type = ${docType}` : sql``}
      ORDER BY d.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    // Get total count for pagination
    const countResult = await sql<{ total: string }[]>`
      SELECT COUNT(*) as total
      FROM landscape.core_doc
      WHERE project_id = ${projectId}::bigint
        ${docType ? sql`AND doc_type = ${docType}` : sql``}
    `;

    const total = parseInt(countResult[0]?.total || '0');

    // Optionally include content preview for each document
    let docsWithContent = docs;
    if (includeContent) {
      docsWithContent = await Promise.all(
        docs.map(async (doc) => {
          if (!doc.has_content) {
            return { ...doc, content_preview: null };
          }

          const preview = await sql<{ content_text: string }[]>`
            SELECT content_text
            FROM landscape.knowledge_embeddings
            WHERE source_type = 'document_chunk'
              AND source_id = ${doc.doc_id}
            ORDER BY embedding_id ASC
            LIMIT 1
          `;

          const previewText = preview[0]?.content_text || '';
          return {
            ...doc,
            content_preview:
              previewText.slice(0, 300) + (previewText.length > 300 ? '...' : ''),
          };
        })
      );
    }

    return NextResponse.json({
      success: true,
      documents: docsWithContent,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + docs.length < total,
      },
    });
  } catch (error) {
    console.error('Project documents fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project documents' },
      { status: 500 }
    );
  }
}
