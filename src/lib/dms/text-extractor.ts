/**
 * Text extraction from PDFs using pdf.js
 * Supports both client and server-side extraction
 */

import { sql } from '@/lib/dms/db';

// Type definitions for pdf.js
interface PDFDocumentProxy {
  numPages: number;
  getPage(pageNumber: number): Promise<PDFPageProxy>;
}

interface PDFPageProxy {
  getTextContent(): Promise<TextContent>;
}

interface TextContent {
  items: TextItem[];
}

interface TextItem {
  str: string;
}

/**
 * Extract text from PDF using pdf.js
 * Works in both Node.js and browser environments
 */
export async function extractTextFromPDF(
  pdfBuffer: Buffer | ArrayBuffer,
  options: {
    maxPages?: number; // Limit number of pages to extract
    maxLength?: number; // Limit total text length (for Meili indexing)
  } = {}
): Promise<{
  text: string;
  wordCount: number;
  pageCount: number;
  truncated: boolean;
}> {
  const { maxPages = Infinity, maxLength = 100000 } = options;

  try {
    // Dynamic import for server-side
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

    // Set worker source (required for Node.js)
    if (typeof window === 'undefined') {
      // Server-side: disable worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = '';
    }

    // Convert Buffer to Uint8Array if needed
    const data = pdfBuffer instanceof Buffer
      ? new Uint8Array(pdfBuffer)
      : new Uint8Array(pdfBuffer);

    // Load PDF
    const loadingTask = pdfjsLib.getDocument({ data, useWorkerFetch: false, isEvalSupported: false });
    const pdf: PDFDocumentProxy = await loadingTask.promise;

    const numPages = Math.min(pdf.numPages, maxPages);
    const textParts: string[] = [];
    let totalLength = 0;
    let truncated = false;

    // Extract text from each page
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');

      if (totalLength + pageText.length > maxLength) {
        // Truncate to max length
        const remaining = maxLength - totalLength;
        textParts.push(pageText.substring(0, remaining));
        truncated = true;
        break;
      }

      textParts.push(pageText);
      totalLength += pageText.length;
    }

    const fullText = textParts.join('\n\n');
    const wordCount = fullText.split(/\s+/).filter(w => w.length > 0).length;

    return {
      text: fullText,
      wordCount,
      pageCount: numPages,
      truncated: truncated || pdf.numPages > maxPages,
    };

  } catch (error) {
    console.error('PDF text extraction failed:', error);
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extract text from document by fetching from storage
 * and save to core_doc_text table
 */
export async function extractAndStoreText(
  docId: number,
  storageUri: string,
  mimeType: string
): Promise<{
  success: boolean;
  wordCount?: number;
  error?: string;
}> {
  try {
    // Only process PDFs for now
    if (mimeType !== 'application/pdf') {
      return {
        success: false,
        error: `Unsupported MIME type: ${mimeType}`,
      };
    }

    // Fetch PDF from storage (assumes public URL or signed URL)
    const response = await fetch(storageUri);
    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();

    // Extract text
    const result = await extractTextFromPDF(arrayBuffer, {
      maxPages: 500, // Limit to 500 pages
      maxLength: 100000, // 100KB for Meili, full text in DB
    });

    // Store in database
    await sql`
      INSERT INTO landscape.core_doc_text (
        doc_id,
        extracted_text,
        word_count,
        extraction_method,
        extracted_at
      ) VALUES (
        ${docId},
        ${result.text},
        ${result.wordCount},
        'pdf.js',
        NOW()
      )
      ON CONFLICT (doc_id) DO UPDATE
      SET
        extracted_text = ${result.text},
        word_count = ${result.wordCount},
        extraction_method = 'pdf.js',
        updated_at = NOW()
    `;

    // Update document status
    await sql`
      UPDATE landscape.core_doc
      SET status = 'indexed', updated_at = NOW()
      WHERE doc_id = ${docId}
    `;

    return {
      success: true,
      wordCount: result.wordCount,
    };

  } catch (error) {
    console.error(`Text extraction failed for doc ${docId}:`, error);

    // Update document status to show extraction failed (non-fatal)
    await sql`
      UPDATE landscape.core_doc
      SET
        profile_json = jsonb_set(
          COALESCE(profile_json, '{}'::jsonb),
          '{_extraction_error}',
          to_jsonb(${error instanceof Error ? error.message : String(error)}::text)
        ),
        updated_at = NOW()
      WHERE doc_id = ${docId}
    `;

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Batch extract text from multiple documents
 */
export async function batchExtractText(
  filters: {
    docIds?: number[];
    status?: string;
    limit?: number;
  } = {}
): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  errors: Array<{ doc_id: number; error: string }>;
}> {
  const { docIds, status = 'processing', limit = 10 } = filters;

  // Find documents needing text extraction
  let query;
  if (docIds && docIds.length > 0) {
    query = sql`
      SELECT doc_id, storage_uri, mime_type
      FROM landscape.core_doc
      WHERE doc_id = ANY(${docIds})
        AND mime_type = 'application/pdf'
        AND status != 'archived'
      LIMIT ${limit}
    `;
  } else {
    query = sql`
      SELECT doc_id, storage_uri, mime_type
      FROM landscape.core_doc
      WHERE status = ${status}
        AND mime_type = 'application/pdf'
        AND NOT EXISTS (
          SELECT 1 FROM landscape.core_doc_text
          WHERE core_doc_text.doc_id = core_doc.doc_id
        )
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
  }

  const result = await query;
  const docs = result.rows;

  let succeeded = 0;
  let failed = 0;
  const errors: Array<{ doc_id: number; error: string }> = [];

  // Process each document
  for (const doc of docs) {
    const extractResult = await extractAndStoreText(
      doc.doc_id,
      doc.storage_uri,
      doc.mime_type
    );

    if (extractResult.success) {
      succeeded++;
    } else {
      failed++;
      errors.push({
        doc_id: doc.doc_id,
        error: extractResult.error || 'Unknown error',
      });
    }
  }

  return {
    processed: docs.length,
    succeeded,
    failed,
    errors,
  };
}

/**
 * API endpoint to trigger text extraction
 * Call this from a cron job or webhook
 */
export async function processTextExtractionQueue(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  errors: Array<{ doc_id: number; error: string }>;
}> {
  console.log('[Text Extraction] Starting batch extraction...');

  const result = await batchExtractText({
    status: 'processing',
    limit: 10, // Process 10 documents per run
  });

  console.log(`[Text Extraction] Processed ${result.processed} documents: ${result.succeeded} succeeded, ${result.failed} failed`);

  return result;
}
