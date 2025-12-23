/**
 * Document Content API
 *
 * GET /api/projects/[projectId]/documents/[docId]/content
 *
 * Returns the extracted text content for a document from RAG embeddings.
 * Useful for:
 * - Document preview in the UI
 * - Including full document text in enhanced chat context
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

interface ContentChunk {
  embedding_id: number;
  content_text: string;
  source_type: string;
  created_at: Date;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; docId: string }> }
) {
  try {
    const { projectId, docId } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'full'; // 'full' | 'chunks' | 'summary'

    // First verify the document belongs to this project
    const docCheck = await sql<{ doc_id: number; doc_name: string; doc_type: string }[]>`
      SELECT doc_id, doc_name, doc_type
      FROM landscape.core_doc
      WHERE doc_id = ${docId}::bigint
        AND project_id = ${projectId}::bigint
    `;

    if (docCheck.length === 0) {
      return NextResponse.json(
        { error: 'Document not found or does not belong to this project' },
        { status: 404 }
      );
    }

    const doc = docCheck[0];

    // Fetch all content chunks for this document from embeddings
    const chunks = await sql<ContentChunk[]>`
      SELECT
        embedding_id,
        content_text,
        source_type,
        created_at
      FROM landscape.knowledge_embeddings
      WHERE source_type = 'document_chunk'
        AND source_id = ${docId}::bigint
      ORDER BY embedding_id ASC
    `;

    if (chunks.length === 0) {
      return NextResponse.json({
        doc_id: doc.doc_id,
        doc_name: doc.doc_name,
        doc_type: doc.doc_type,
        has_content: false,
        message: 'No extracted content available. Document may not have been processed yet.',
        chunks: [],
        full_text: '',
      });
    }

    // Format based on requested format
    if (format === 'chunks') {
      // Return individual chunks with metadata
      return NextResponse.json({
        doc_id: doc.doc_id,
        doc_name: doc.doc_name,
        doc_type: doc.doc_type,
        has_content: true,
        chunk_count: chunks.length,
        chunks: chunks.map((c) => ({
          id: c.embedding_id,
          text: c.content_text,
          created_at: c.created_at,
        })),
      });
    }

    if (format === 'summary') {
      // Return just the first chunk as a preview
      const previewText = chunks[0]?.content_text || '';
      const totalChars = chunks.reduce((sum, c) => sum + c.content_text.length, 0);

      return NextResponse.json({
        doc_id: doc.doc_id,
        doc_name: doc.doc_name,
        doc_type: doc.doc_type,
        has_content: true,
        chunk_count: chunks.length,
        total_characters: totalChars,
        preview: previewText.slice(0, 500) + (previewText.length > 500 ? '...' : ''),
      });
    }

    // Default: full text - concatenate all chunks
    const fullText = chunks.map((c) => c.content_text).join('\n\n');

    return NextResponse.json({
      doc_id: doc.doc_id,
      doc_name: doc.doc_name,
      doc_type: doc.doc_type,
      has_content: true,
      chunk_count: chunks.length,
      total_characters: fullText.length,
      full_text: fullText,
    });
  } catch (error) {
    console.error('Document content fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document content' },
      { status: 500 }
    );
  }
}
