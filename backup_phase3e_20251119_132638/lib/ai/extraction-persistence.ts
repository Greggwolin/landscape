/**
 * Extraction Persistence Service
 *
 * Handles saving unified extraction results to Neon database tables:
 * - dms_extract_queue (job tracking + full JSON)
 * - dms_unmapped (fields that couldn't be auto-mapped)
 * - dms_assertion (doc-stated metrics with provenance)
 */

import { sql } from '@/lib/db';
import type { UnifiedExtractionResult } from './unified-extractor';

export interface PersistenceOptions {
  docId: string;
  projectId: number;
  fileUri?: string;
}

/**
 * Main persistence function - saves all extraction data
 */
export async function persistExtractionResult(
  result: UnifiedExtractionResult,
  options: PersistenceOptions
): Promise<{
  queueId: number;
  unmappedCount: number;
  assertionCount: number;
}> {
  const { docId, projectId, fileUri } = options;

  console.log('💾 Persisting extraction result to Neon...');
  console.log(`   doc_id: ${docId}`);
  console.log(`   project_id: ${projectId}`);

  try {
    // 1. Upsert to dms_extract_queue
    const queueId = await upsertExtractQueue(docId, projectId, result, fileUri);
    console.log(`✅ Queue record created: queue_id=${queueId}`);

    // 2. Insert unmapped fields
    const unmappedCount = await insertUnmappedFields(
      docId,
      projectId,
      result.unmapped
    );
    console.log(`✅ Unmapped fields inserted: ${unmappedCount}`);

    // 3. Insert doc assertions
    const assertionCount = await insertDocAssertions(
      docId,
      projectId,
      result
    );
    console.log(`✅ Assertions inserted: ${assertionCount}`);

    console.log('✅ Persistence complete');

    return {
      queueId,
      unmappedCount,
      assertionCount
    };
  } catch (error) {
    console.error('❌ Persistence error:', error);
    throw error;
  }
}

/**
 * Upsert extraction queue record with full JSON
 */
async function upsertExtractQueue(
  docId: string,
  projectId: number,
  result: UnifiedExtractionResult,
  fileUri?: string
): Promise<number> {
  const rows = await sql`
    INSERT INTO landscape.dms_extract_queue (
      doc_id,
      project_id,
      file_uri,
      status,
      extracted_data,
      processed_at,
      updated_at
    )
    VALUES (
      ${docId},
      ${projectId},
      ${fileUri || null},
      'processed',
      ${JSON.stringify(result)}::jsonb,
      NOW(),
      NOW()
    )
    ON CONFLICT (doc_id) DO UPDATE SET
      status = 'processed',
      extracted_data = ${JSON.stringify(result)}::jsonb,
      processed_at = NOW(),
      updated_at = NOW()
    RETURNING queue_id
  `;

  return rows[0].queue_id;
}

/**
 * Mark extraction as failed in queue
 */
export async function markExtractionFailed(
  docId: string,
  projectId: number,
  errorMessage: string,
  rawResponse?: string
): Promise<number> {
  const rows = await sql`
    INSERT INTO landscape.dms_extract_queue (
      doc_id,
      project_id,
      status,
      error_message,
      raw_response,
      updated_at
    )
    VALUES (
      ${docId},
      ${projectId},
      'error',
      ${errorMessage},
      ${rawResponse || null},
      NOW()
    )
    ON CONFLICT (doc_id) DO UPDATE SET
      status = 'error',
      error_message = ${errorMessage},
      raw_response = ${rawResponse || null},
      updated_at = NOW()
    RETURNING queue_id
  `;

  return rows[0].queue_id;
}

/**
 * Check if document has already been processed (idempotency)
 */
export async function isDocumentProcessed(docId: string): Promise<boolean> {
  const rows = await sql`
    SELECT queue_id, status
    FROM landscape.dms_extract_queue
    WHERE doc_id = ${docId}
      AND status IN ('processed', 'processing')
  `;

  return rows.length > 0;
}

/**
 * Insert unmapped fields
 */
async function insertUnmappedFields(
  docId: string,
  projectId: number,
  unmapped: UnifiedExtractionResult['unmapped']
): Promise<number> {
  if (unmapped.length === 0) {
    return 0;
  }

  // Delete existing unmapped fields for this doc (for idempotency)
  await sql`
    DELETE FROM landscape.dms_unmapped
    WHERE doc_id = ${docId}
  `;

  // Batch insert all unmapped fields
  const values = unmapped.map((item) => {
    const bboxArray = item.bbox
      ? `ARRAY[${item.bbox.join(',')}]::decimal[]`
      : 'NULL';

    return sql`(
      ${docId},
      ${projectId},
      ${item.key},
      ${String(item.value)},
      ${item.target_table_candidates || []},
      ${item.page || null},
      ${sql.unsafe(bboxArray)},
      'new',
      NOW()
    )`;
  });

  await sql`
    INSERT INTO landscape.dms_unmapped (
      doc_id,
      project_id,
      source_key,
      raw_value,
      candidate_targets,
      page,
      bbox,
      status,
      created_at
    )
    VALUES ${sql.unsafe(values.map((v, i) => `$${i + 1}`).join(','))}
  `.queryWith(values);

  return unmapped.length;
}

/**
 * Insert document assertions
 */
async function insertDocAssertions(
  docId: string,
  projectId: number,
  result: UnifiedExtractionResult
): Promise<number> {
  const assertions: Array<{
    subject_type: string;
    subject_ref: string | null;
    metric_key: string;
    value_num: number | null;
    value_text: string | null;
    units: string | null;
    context: string;
    page: number | null;
    bbox: number[] | null;
    confidence: number;
    source: string;
    as_of_date: string | null;
  }> = [];

  // Extract document date
  const docDate = result.mapped.core_doc?.doc_date || null;

  // Add project-level assertions
  if (result.mapped.tbl_project.acres_gross) {
    assertions.push({
      subject_type: 'project',
      subject_ref: null,
      metric_key: 'acres_gross',
      value_num: result.mapped.tbl_project.acres_gross,
      value_text: null,
      units: 'ac',
      context: 'proposed',
      page: null,
      bbox: null,
      confidence: 0.95,
      source: 'table',
      as_of_date: docDate
    });
  }

  // Add parcel-level assertions
  result.mapped.tbl_parcel.forEach((parcel) => {
    const parcelRef = parcel.parcel_id || null;

    if (parcel.units_total !== undefined) {
      assertions.push({
        subject_type: 'parcel',
        subject_ref: parcelRef,
        metric_key: 'units_total',
        value_num: parcel.units_total,
        value_text: null,
        units: 'units',
        context: 'proposed',
        page: parcel.page || null,
        bbox: parcel.bbox || null,
        confidence: 0.95,
        source: 'table',
        as_of_date: docDate
      });
    }

    if (parcel.acres_gross !== undefined) {
      assertions.push({
        subject_type: 'parcel',
        subject_ref: parcelRef,
        metric_key: 'acres_gross',
        value_num: parcel.acres_gross,
        value_text: null,
        units: 'ac',
        context: 'proposed',
        page: parcel.page || null,
        bbox: parcel.bbox || null,
        confidence: 0.95,
        source: 'table',
        as_of_date: docDate
      });
    }

    if (parcel.plan_density_du_ac !== undefined) {
      assertions.push({
        subject_type: 'parcel',
        subject_ref: parcelRef,
        metric_key: 'plan_density_du_ac',
        value_num: parcel.plan_density_du_ac,
        value_text: null,
        units: 'du/ac',
        context: 'proposed',
        page: parcel.page || null,
        bbox: parcel.bbox || null,
        confidence: 0.94,
        source: 'table',
        as_of_date: docDate
      });
    }

    if (parcel.open_space_ac !== undefined) {
      assertions.push({
        subject_type: 'parcel',
        subject_ref: parcelRef,
        metric_key: 'open_space_ac',
        value_num: parcel.open_space_ac,
        value_text: null,
        units: 'ac',
        context: 'proposed',
        page: parcel.page || null,
        bbox: parcel.bbox || null,
        confidence: 0.93,
        source: 'table',
        as_of_date: docDate
      });
    }

    if (parcel.open_space_pct !== undefined) {
      assertions.push({
        subject_type: 'parcel',
        subject_ref: parcelRef,
        metric_key: 'open_space_pct',
        value_num: parcel.open_space_pct,
        value_text: null,
        units: '%',
        context: 'proposed',
        page: parcel.page || null,
        bbox: parcel.bbox || null,
        confidence: 0.93,
        source: 'table',
        as_of_date: docDate
      });
    }

    if (parcel.lot_product) {
      assertions.push({
        subject_type: 'parcel',
        subject_ref: parcelRef,
        metric_key: 'lot_product',
        value_num: null,
        value_text: parcel.lot_product,
        units: null,
        context: 'proposed',
        page: parcel.page || null,
        bbox: parcel.bbox || null,
        confidence: 0.85,
        source: 'table',
        as_of_date: docDate
      });
    }
  });

  // Add product mix assertions
  result.parcel_product_mix.forEach((product) => {
    assertions.push({
      subject_type: 'product',
      subject_ref: String(product.parcel),
      metric_key: 'lot_width_ft',
      value_num: product.width_ft,
      value_text: null,
      units: 'ft',
      context: 'proposed',
      page: product.page || null,
      bbox: product.bbox || null,
      confidence: product.confidence,
      source: 'table',
      as_of_date: docDate
    });

    assertions.push({
      subject_type: 'product',
      subject_ref: String(product.parcel),
      metric_key: 'lot_depth_ft',
      value_num: product.depth_ft,
      value_text: null,
      units: 'ft',
      context: 'proposed',
      page: product.page || null,
      bbox: product.bbox || null,
      confidence: product.confidence,
      source: 'table',
      as_of_date: docDate
    });

    assertions.push({
      subject_type: 'product',
      subject_ref: String(product.parcel),
      metric_key: 'product_count',
      value_num: product.count,
      value_text: null,
      units: 'units',
      context: 'proposed',
      page: product.page || null,
      bbox: product.bbox || null,
      confidence: product.confidence,
      source: 'table',
      as_of_date: docDate
    });
  });

  // Add custom doc_assertions from extraction
  result.doc_assertions?.forEach((assertion) => {
    assertions.push({
      subject_type: assertion.subject_type,
      subject_ref: assertion.subject_ref || null,
      metric_key: assertion.metric_key,
      value_num: assertion.value_num || null,
      value_text: assertion.value_text || null,
      units: assertion.units || null,
      context: assertion.context || 'other',
      page: assertion.page || null,
      bbox: assertion.bbox || null,
      confidence: assertion.confidence,
      source: assertion.source,
      as_of_date: docDate
    });
  });

  if (assertions.length === 0) {
    return 0;
  }

  // Delete existing assertions for this doc (for idempotency)
  await sql`
    DELETE FROM landscape.dms_assertion
    WHERE doc_id = ${docId}
  `;

  // Batch insert assertions
  for (const assertion of assertions) {
    const bboxArray = assertion.bbox
      ? `ARRAY[${assertion.bbox.join(',')}]::decimal[]`
      : null;

    await sql`
      INSERT INTO landscape.dms_assertion (
        project_id,
        doc_id,
        subject_type,
        subject_ref,
        metric_key,
        value_num,
        value_text,
        units,
        context,
        page,
        bbox,
        confidence,
        source,
        as_of_date,
        created_at
      )
      VALUES (
        ${projectId},
        ${docId},
        ${assertion.subject_type},
        ${assertion.subject_ref},
        ${assertion.metric_key},
        ${assertion.value_num},
        ${assertion.value_text},
        ${assertion.units},
        ${assertion.context},
        ${assertion.page},
        ${bboxArray ? sql.unsafe(bboxArray) : null},
        ${assertion.confidence},
        ${assertion.source},
        ${assertion.as_of_date},
        NOW()
      )
    `;
  }

  return assertions.length;
}

/**
 * Get extraction queue status for a document
 */
export async function getExtractionStatus(docId: string): Promise<{
  status: string;
  extractedData: any | null;
  errorMessage: string | null;
  processedAt: Date | null;
} | null> {
  const rows = await sql`
    SELECT status, extracted_data, error_message, processed_at
    FROM landscape.dms_extract_queue
    WHERE doc_id = ${docId}
  `;

  if (rows.length === 0) {
    return null;
  }

  return {
    status: rows[0].status,
    extractedData: rows[0].extracted_data,
    errorMessage: rows[0].error_message,
    processedAt: rows[0].processed_at
  };
}
