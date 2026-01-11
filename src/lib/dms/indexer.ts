/**
 * DMS Document Indexer for Meilisearch
 * Syncs documents from landscape.core_doc to Meilisearch
 */

import { sql } from './db';
import { indexDocuments, removeDocuments, type SearchableDocument } from './meili';

/**
 * Build searchable text from document metadata, profile, and fulltext
 */
function buildSearchableText(doc: any): string {
  const parts: string[] = [
    doc.doc_name || '',
    doc.doc_type || '',
    doc.discipline || '',
    doc.project_name || '',
    doc.workspace_name || '',
    doc.phase_name || '',
    doc.folder_name || '',
  ];

  // Extract searchable values from profile_json
  if (doc.profile_json) {
    const profile = typeof doc.profile_json === 'string'
      ? JSON.parse(doc.profile_json)
      : doc.profile_json;

    Object.entries(profile).forEach(([key, value]) => {
      if (typeof value === 'string') {
        parts.push(value);
      } else if (Array.isArray(value)) {
        parts.push(...value.filter(v => typeof v === 'string'));
      }
    });
  }

  // Add extracted text (truncated for searchable_text, full text in separate field)
  if (doc.extracted_text) {
    parts.push(doc.extracted_text.substring(0, 10000)); // First 10KB
  }

  return parts.filter(Boolean).join(' ');
}

/**
 * Extract priority from profile_json
 */
function extractPriority(profile_json: any): string | undefined {
  if (!profile_json) return undefined;
  const profile = typeof profile_json === 'string' ? JSON.parse(profile_json) : profile_json;
  return profile.priority;
}

/**
 * Extract tags from profile_json
 */
function extractTags(profile_json: any): string[] | undefined {
  if (!profile_json) return undefined;
  const profile = typeof profile_json === 'string' ? JSON.parse(profile_json) : profile_json;
  return Array.isArray(profile.tags) ? profile.tags : undefined;
}

/**
 * Extract contract_value from profile_json
 */
function extractContractValue(profile_json: any): number | undefined {
  if (!profile_json) return undefined;
  const profile = typeof profile_json === 'string' ? JSON.parse(profile_json) : profile_json;
  return typeof profile.contract_value === 'number' ? profile.contract_value : undefined;
}

/**
 * Extract doc_date from profile_json
 */
function extractDocDate(profile_json: any): string | undefined {
  if (!profile_json) return undefined;
  const profile = typeof profile_json === 'string' ? JSON.parse(profile_json) : profile_json;
  return profile.doc_date;
}

/**
 * Sync documents from database to Meilisearch
 * @param filters Optional filters for selective sync
 * @returns Number of documents indexed
 */
export async function syncDocumentsToMeili(filters?: {
  projectId?: number;
  workspaceId?: number;
  docType?: string;
  status?: string;
  sinceDate?: Date;
}): Promise<number> {
  try {
    console.log('🔄 Starting Meilisearch document sync...');

    // Build query with optional filters (includes folder and fulltext)
    const docs = await sql<any[]>`
      SELECT
        d.doc_id,
        d.project_id,
        d.workspace_id,
        d.phase_id,
        COALESCE(d.parcel_id_int, d.parcel_id)::integer as parcel_id,
        d.doc_name,
        d.doc_type,
        d.discipline,
        d.status,
        d.version_no,
        d.profile_json,
        d.created_at,
        d.updated_at,
        p.project_name,
        NULL as workspace_name,
        ph.phase_no::text as phase_name,
        NULL as parcel_name,
        -- Folder info
        fl.folder_id,
        f.path as folder_path,
        f.name as folder_name,
        -- Full-text
        dt.extracted_text,
        dt.word_count
      FROM landscape.core_doc d
      LEFT JOIN landscape.tbl_project p ON d.project_id = p.project_id
      LEFT JOIN landscape.tbl_phase ph ON d.phase_id = ph.phase_id
      LEFT JOIN landscape.core_doc_folder_link fl ON d.doc_id = fl.doc_id
      LEFT JOIN landscape.core_doc_folder f ON fl.folder_id = f.folder_id
      LEFT JOIN landscape.core_doc_text dt ON d.doc_id = dt.doc_id
      WHERE d.status != 'archived'
        ${filters?.projectId ? sql`AND d.project_id = ${filters.projectId}` : sql``}
        ${filters?.workspaceId ? sql`AND d.workspace_id = ${filters.workspaceId}` : sql``}
        ${filters?.docType ? sql`AND d.doc_type = ${filters.docType}` : sql``}
        ${filters?.status ? sql`AND d.status = ${filters.status}` : sql``}
        ${filters?.sinceDate ? sql`AND d.updated_at >= ${filters.sinceDate.toISOString()}` : sql``}
      ORDER BY d.updated_at DESC
    `;

    if (docs.length === 0) {
      console.log('ℹ️ No documents to sync');
      return 0;
    }

    // Transform to SearchableDocument format
    const searchableDocs: SearchableDocument[] = docs.map(doc => ({
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
      doc_date: extractDocDate(doc.profile_json),
      contract_value: extractContractValue(doc.profile_json),
      priority: extractPriority(doc.profile_json),
      tags: extractTags(doc.profile_json),
      profile_json: typeof doc.profile_json === 'string'
        ? JSON.parse(doc.profile_json)
        : doc.profile_json,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
      project_name: doc.project_name,
      workspace_name: doc.workspace_name,
      phase_name: doc.phase_name,
      parcel_name: doc.parcel_name,
      // Folder fields
      folder_id: doc.folder_id,
      folder_path: doc.folder_path,
      folder_name: doc.folder_name,
      // Full-text fields
      fulltext: doc.extracted_text ? doc.extracted_text.substring(0, 100000) : undefined, // 100KB for Meili
      word_count: doc.word_count,
      searchable_text: buildSearchableText(doc),
    }));

    // Index documents in Meilisearch
    await indexDocuments(searchableDocs);

    console.log(`✅ Synced ${searchableDocs.length} documents to Meilisearch`);
    return searchableDocs.length;

  } catch (error) {
    console.error('❌ Failed to sync documents to Meilisearch:', error);
    throw error;
  }
}

/**
 * Index a single document (used after creation/update)
 */
export async function indexSingleDocument(docId: number): Promise<void> {
  try {
    const docs = await sql<any[]>`
      SELECT
        d.doc_id,
        d.project_id,
        d.workspace_id,
        d.phase_id,
        COALESCE(d.parcel_id_int, d.parcel_id)::integer as parcel_id,
        d.doc_name,
        d.doc_type,
        d.discipline,
        d.status,
        d.version_no,
        d.profile_json,
        d.created_at,
        d.updated_at,
        p.project_name,
        NULL as workspace_name,
        ph.phase_no::text as phase_name,
        NULL as parcel_name,
        -- Folder info
        fl.folder_id,
        f.path as folder_path,
        f.name as folder_name,
        -- Full-text
        dt.extracted_text,
        dt.word_count
      FROM landscape.core_doc d
      LEFT JOIN landscape.tbl_project p ON d.project_id = p.project_id
      LEFT JOIN landscape.tbl_phase ph ON d.phase_id = ph.phase_id
      LEFT JOIN landscape.core_doc_folder_link fl ON d.doc_id = fl.doc_id
      LEFT JOIN landscape.core_doc_folder f ON fl.folder_id = f.folder_id
      LEFT JOIN landscape.core_doc_text dt ON d.doc_id = dt.doc_id
      WHERE d.doc_id = ${docId}
    `;

    if (docs.length === 0) {
      console.warn(`⚠️ Document ${docId} not found for indexing`);
      return;
    }

    const doc = docs[0];
    const searchableDoc: SearchableDocument = {
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
      doc_date: extractDocDate(doc.profile_json),
      contract_value: extractContractValue(doc.profile_json),
      priority: extractPriority(doc.profile_json),
      tags: extractTags(doc.profile_json),
      profile_json: typeof doc.profile_json === 'string'
        ? JSON.parse(doc.profile_json)
        : doc.profile_json,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
      project_name: doc.project_name,
      workspace_name: doc.workspace_name,
      phase_name: doc.phase_name,
      parcel_name: doc.parcel_name,
      // Folder fields
      folder_id: doc.folder_id,
      folder_path: doc.folder_path,
      folder_name: doc.folder_name,
      // Full-text fields
      fulltext: doc.extracted_text ? doc.extracted_text.substring(0, 100000) : undefined,
      word_count: doc.word_count,
      searchable_text: buildSearchableText(doc),
    };

    await indexDocuments([searchableDoc]);
    console.log(`✅ Indexed document ${docId}`);

  } catch (error) {
    console.error(`❌ Failed to index document ${docId}:`, error);
    throw error;
  }
}

/**
 * Remove document from Meilisearch index
 */
export async function removeDocumentFromIndex(docId: number): Promise<void> {
  try {
    await removeDocuments([docId]);
    console.log(`🗑️ Removed document ${docId} from index`);
  } catch (error) {
    console.error(`❌ Failed to remove document ${docId} from index:`, error);
    throw error;
  }
}

/**
 * Refresh materialized view (database fallback search)
 */
export async function refreshSearchMV(): Promise<void> {
  try {
    console.log('🔄 Refreshing mv_doc_search materialized view...');
    await sql`REFRESH MATERIALIZED VIEW landscape.mv_doc_search`;
    console.log('✅ Materialized view refreshed');
  } catch (error) {
    console.error('❌ Failed to refresh materialized view:', error);
    throw error;
  }
}

/**
 * Full reindex - sync all documents and refresh MV
 */
export async function fullReindex(): Promise<{ meiliCount: number }> {
  try {
    console.log('🔄 Starting full reindex...');

    // Sync to Meilisearch
    const meiliCount = await syncDocumentsToMeili();

    // Refresh materialized view
    await refreshSearchMV();

    console.log(`✅ Full reindex complete: ${meiliCount} documents`);
    return { meiliCount };

  } catch (error) {
    console.error('❌ Full reindex failed:', error);
    throw error;
  }
}
