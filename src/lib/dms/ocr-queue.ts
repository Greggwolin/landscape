/**
 * OCR/Extraction Queue Management (Stub)
 * Enqueues documents for text extraction and processing
 */

import { sql } from './db';

export interface QueueJob {
  queue_id: number;
  doc_id: number;
  extract_type: 'ocr' | 'metadata' | 'embedding' | 'full';
  priority: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  max_attempts: number;
  error_message?: string;
  extracted_data: Record<string, any>;
  created_at: string;
  processed_at?: string;
}

/**
 * Enqueue a document for extraction
 */
export async function enqueueForExtraction(
  docId: number,
  extractType: 'ocr' | 'metadata' | 'embedding' | 'full' = 'full',
  priority: number = 0
): Promise<QueueJob> {
  const result = await sql<QueueJob[]>`
    INSERT INTO landscape.dms_extract_queue (
      doc_id,
      extract_type,
      priority,
      status,
      attempts,
      max_attempts,
      extracted_data
    )
    VALUES (
      ${docId},
      ${extractType},
      ${priority},
      'pending',
      0,
      3,
      '{}'::jsonb
    )
    RETURNING *
  `;

  console.log(`📝 Enqueued document ${docId} for ${extractType} extraction`);
  return result[0];
}

/**
 * Get next pending job from queue
 */
export async function getNextQueueJob(): Promise<QueueJob | null> {
  const result = await sql<QueueJob[]>`
    SELECT * FROM landscape.dms_extract_queue
    WHERE status = 'pending'
      AND attempts < max_attempts
    ORDER BY priority DESC, created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  `;

  return result[0] || null;
}

/**
 * Mark job as processing
 */
export async function markJobProcessing(queueId: number): Promise<void> {
  await sql`
    UPDATE landscape.dms_extract_queue
    SET status = 'processing',
        attempts = attempts + 1
    WHERE queue_id = ${queueId}
  `;
}

/**
 * Mark job as completed with extracted data
 */
export async function markJobCompleted(
  queueId: number,
  extractedData: Record<string, any>
): Promise<void> {
  await sql`
    UPDATE landscape.dms_extract_queue
    SET status = 'completed',
        extracted_data = ${JSON.stringify(extractedData)},
        processed_at = NOW()
    WHERE queue_id = ${queueId}
  `;

  console.log(`✅ Completed extraction job ${queueId}`);
}

/**
 * Mark job as failed with error message
 */
export async function markJobFailed(
  queueId: number,
  errorMessage: string
): Promise<void> {
  await sql`
    UPDATE landscape.dms_extract_queue
    SET status = 'failed',
        error_message = ${errorMessage},
        processed_at = NOW()
    WHERE queue_id = ${queueId}
  `;

  console.error(`❌ Failed extraction job ${queueId}: ${errorMessage}`);
}

/**
 * Process extraction queue (stub implementation)
 * In production, this would be a background worker
 */
export async function processQueueStub(): Promise<void> {
  console.log('⚙️ OCR Queue processor stub - not yet implemented');
  console.log('   Real implementation would:');
  console.log('   - Fetch document from storage');
  console.log('   - Extract text via OCR (Tesseract/Claude Vision)');
  console.log('   - Generate embeddings');
  console.log('   - Update document with extracted data');
  console.log('   - Index in Meilisearch');
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}> {
  const result = await sql<Array<{ status: string; count: string }>>`
    SELECT status, COUNT(*)::text as count
    FROM landscape.dms_extract_queue
    GROUP BY status
  `;

  const stats = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  };

  result.forEach((row) => {
    stats[row.status as keyof typeof stats] = parseInt(row.count);
  });

  return stats;
}
