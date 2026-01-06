/**
 * DMS Document Indexing for Meilisearch
 */

import { sql } from './db';
import { indexDocuments } from './meili';
import { DMSDocument, SearchableDocument } from '../../types/dms';

// Convert database document to searchable format
export function documentToSearchable(dbDoc: DMSDocument): SearchableDocument {
  return {
    doc_id: dbDoc.doc_id,
    project_id: dbDoc.project_id,
    workspace_id: dbDoc.workspace_id,
    phase_id: dbDoc.phase_id,
    parcel_id: dbDoc.parcel_id_int ?? dbDoc.parcel_id,
    doc_name: dbDoc.doc_name,
    doc_type: dbDoc.doc_type,
    discipline: dbDoc.discipline,
    status: dbDoc.status,
    version_no: dbDoc.version_no,
    doc_date: dbDoc.doc_date,
    contract_value: dbDoc.contract_value,
    priority: dbDoc.priority,
    tags: dbDoc.tags || [],
    profile_json: dbDoc.profile_json || {},
    created_at: dbDoc.created_at,
    updated_at: dbDoc.updated_at,
    
    // Derived fields
    project_name: dbDoc.project_name,
    workspace_name: dbDoc.workspace_name,
    phase_no: dbDoc.phase_no,
    searchable_text: buildSearchableText(dbDoc),
    extracted_text: dbDoc.extracted_text || '' // From OCR/extraction
  };
}

// Build searchable text from document fields
function buildSearchableText(dbDoc: DMSDocument): string {
  const parts = [
    dbDoc.doc_name,
    dbDoc.doc_type,
    dbDoc.discipline,
    dbDoc.profile_json?.description,
    dbDoc.profile_json?.tags?.join(' '),
    dbDoc.project_name,
    dbDoc.workspace_name
  ].filter(Boolean);
  
  return parts.join(' ').toLowerCase();
}

// Index a single document
export async function indexSingleDocument(docId: number) {
  try {
    // Fetch document with related data
    const docs = await sql`
      SELECT 
        d.*,
        p.project_name,
        w.workspace_name,
        ph.phase_no::text as phase_no,
        eq.extracted_data->>'extracted_text' as extracted_text
      FROM landscape.core_doc d
      LEFT JOIN landscape.tbl_project p ON d.project_id = p.project_id
      LEFT JOIN landscape.dms_workspaces w ON d.workspace_id = w.workspace_id
      LEFT JOIN landscape.tbl_phase ph ON d.phase_id = ph.phase_id
      LEFT JOIN landscape.dms_extract_queue eq ON d.doc_id = eq.doc_id AND eq.status = 'completed'
      WHERE d.doc_id = ${docId}
        AND d.status != 'archived'
    `;

    if (docs.length === 0) {
      console.log(`Document ${docId} not found or archived`);
      return null;
    }

    const searchableDoc = documentToSearchable(docs[0]);
    await indexDocuments([searchableDoc]);
    
    console.log(`✅ Indexed document ${docId}: ${searchableDoc.doc_name}`);
    return searchableDoc;

  } catch (error) {
    console.error(`❌ Failed to index document ${docId}:`, error);
    throw error;
  }
}

// Bulk index all documents
export async function indexAllDocuments() {
  try {
    console.log('🚀 Starting bulk document indexing...');
    
    // Fetch all non-archived documents with related data
    const docs = await sql`
      SELECT 
        d.*,
        p.project_name,
        w.workspace_name,
        ph.phase_no::text as phase_no,
        eq.extracted_data->>'extracted_text' as extracted_text
      FROM landscape.core_doc d
      LEFT JOIN landscape.tbl_project p ON d.project_id = p.project_id
      LEFT JOIN landscape.dms_workspaces w ON d.workspace_id = w.workspace_id
      LEFT JOIN landscape.tbl_phase ph ON d.phase_id = ph.phase_id
      LEFT JOIN landscape.dms_extract_queue eq ON d.doc_id = eq.doc_id AND eq.status = 'completed'
      WHERE d.status != 'archived'
      ORDER BY d.created_at DESC
    `;

    if (docs.length === 0) {
      console.log('No documents found to index');
      return [];
    }

    // Convert to searchable format
    const searchableDocs = docs.map(documentToSearchable);
    
    // Index in batches of 1000
    const batchSize = 1000;
    const batches = [];
    for (let i = 0; i < searchableDocs.length; i += batchSize) {
      batches.push(searchableDocs.slice(i, i + batchSize));
    }

    console.log(`📦 Indexing ${searchableDocs.length} documents in ${batches.length} batches...`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      await indexDocuments(batch);
      console.log(`✅ Indexed batch ${i + 1}/${batches.length} (${batch.length} documents)`);
    }

    console.log(`🎉 Bulk indexing completed: ${searchableDocs.length} documents indexed`);
    return searchableDocs;

  } catch (error) {
    console.error('❌ Bulk indexing failed:', error);
    throw error;
  }
}

// Re-index documents for a specific project
export async function indexProjectDocuments(projectId: number) {
  try {
    console.log(`🚀 Indexing documents for project ${projectId}...`);
    
    const docs = await sql`
      SELECT 
        d.*,
        p.project_name,
        w.workspace_name,
        ph.phase_no::text as phase_no,
        eq.extracted_data->>'extracted_text' as extracted_text
      FROM landscape.core_doc d
      LEFT JOIN landscape.tbl_project p ON d.project_id = p.project_id
      LEFT JOIN landscape.dms_workspaces w ON d.workspace_id = w.workspace_id
      LEFT JOIN landscape.tbl_phase ph ON d.phase_id = ph.phase_id
      LEFT JOIN landscape.dms_extract_queue eq ON d.doc_id = eq.doc_id AND eq.status = 'completed'
      WHERE d.project_id = ${projectId}
        AND d.status != 'archived'
      ORDER BY d.created_at DESC
    `;

    const searchableDocs = docs.map(documentToSearchable);
    
    if (searchableDocs.length > 0) {
      await indexDocuments(searchableDocs);
      console.log(`✅ Indexed ${searchableDocs.length} documents for project ${projectId}`);
    } else {
      console.log(`No documents found for project ${projectId}`);
    }

    return searchableDocs;

  } catch (error) {
    console.error(`❌ Failed to index project ${projectId} documents:`, error);
    throw error;
  }
}

// Build search filters from parameters
export function buildSearchFilters(params: {
  projectId?: number;
  workspaceId?: number;
  docType?: string;
  discipline?: string;
  status?: string;
  priority?: string;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
}) {
  const filters: string[] = [];

  if (params.projectId) {
    filters.push(`project_id = ${params.projectId}`);
  }

  if (params.workspaceId) {
    filters.push(`workspace_id = ${params.workspaceId}`);
  }

  if (params.docType) {
    filters.push(`doc_type = "${params.docType}"`);
  }

  if (params.discipline) {
    filters.push(`discipline = "${params.discipline}"`);
  }

  if (params.status) {
    filters.push(`status = "${params.status}"`);
  }

  if (params.priority) {
    filters.push(`priority = "${params.priority}"`);
  }

  if (params.tags && params.tags.length > 0) {
    const tagFilters = params.tags.map(tag => `tags = "${tag}"`);
    filters.push(`(${tagFilters.join(' OR ')})`);
  }

  if (params.dateFrom) {
    filters.push(`doc_date >= "${params.dateFrom}"`);
  }

  if (params.dateTo) {
    filters.push(`doc_date <= "${params.dateTo}"`);
  }

  return filters;
}
