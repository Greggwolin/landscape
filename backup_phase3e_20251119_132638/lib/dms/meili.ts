/**
 * Meilisearch Client Configuration for DMS
 */

import { MeiliSearch } from 'meilisearch';

// Lazy-initialize Meilisearch client
let _meiliClient: MeiliSearch | null = null;

export function getMeiliClient(): MeiliSearch {
  if (_meiliClient) return _meiliClient;

  const host = process.env.NEXT_PUBLIC_MEILI_HOST || 'http://localhost:7700';
  const apiKey = process.env.NEXT_PUBLIC_MEILI_API_KEY || 'masterKey';

  _meiliClient = new MeiliSearch({
    host,
    apiKey,
  });

  return _meiliClient;
}

// Document index name
export const DOCS_INDEX = 'dms_documents';

// Document search interface
export interface SearchableDocument {
  doc_id: number;
  project_id: number;
  workspace_id: number;
  phase_id?: number;
  parcel_id?: number;
  doc_name: string;
  doc_type: string;
  discipline?: string;
  status: string;
  version_no: number;
  doc_date?: string;
  contract_value?: number;
  priority?: string;
  tags?: string[];
  profile_json: Record<string, any>;
  created_at: string;
  updated_at: string;

  // Derived fields for search
  project_name?: string;
  workspace_name?: string;
  phase_name?: string;
  parcel_name?: string;
  searchable_text: string;

  // Folder fields (Step 7)
  folder_id?: number;
  folder_path?: string;
  folder_name?: string;

  // Full-text fields (Step 7)
  fulltext?: string; // Extracted text content (truncated for Meili)
  word_count?: number;
}

// Search facets configuration
export interface SearchFacets {
  doc_type: Record<string, number>;
  discipline: Record<string, number>;
  status: Record<string, number>;
  priority: Record<string, number>;
  tags: Record<string, number>;
  workspace_name: Record<string, number>;
  project_name: Record<string, number>;
}

// Initialize the documents index
export async function initializeDocsIndex() {
  const client = getMeiliClient();
  
  try {
    // Create index if it doesn't exist
    const index = client.index(DOCS_INDEX);
    
    // Configure searchable attributes (Step 7: added folder_name, fulltext)
    await index.updateSearchableAttributes([
      'doc_name',
      'searchable_text',
      'fulltext', // Full extracted text
      'doc_type',
      'discipline',
      'tags',
      'folder_name'
    ]);

    // Configure filterable attributes for faceting (Step 7: added folder fields)
    await index.updateFilterableAttributes([
      'project_id',
      'workspace_id',
      'phase_id',
      'parcel_id',
      'doc_type',
      'discipline',
      'status',
      'priority',
      'tags',
      'doc_date',
      'contract_value',
      'project_name',
      'workspace_name',
      'folder_id', // Step 7
      'folder_path' // Step 7
    ]);

    // Configure sortable attributes
    await index.updateSortableAttributes([
      'created_at',
      'updated_at',
      'doc_date',
      'contract_value',
      'doc_name'
    ]);

    // Configure displayed attributes
    await index.updateDisplayedAttributes([
      'doc_id',
      'doc_name',
      'doc_type',
      'discipline',
      'status',
      'version_no',
      'doc_date',
      'priority',
      'tags',
      'project_name',
      'workspace_name',
      'created_at',
      'updated_at'
    ]);

    // Configure ranking rules for relevance
    await index.updateRankingRules([
      'words',
      'typo',
      'proximity',
      'attribute',
      'sort',
      'exactness'
    ]);

    console.log('✅ Meilisearch documents index initialized');
    return index;

  } catch (error) {
    console.error('❌ Failed to initialize Meilisearch index:', error);
    throw error;
  }
}

// Add or update documents in search index
export async function indexDocuments(documents: SearchableDocument[]) {
  const client = getMeiliClient();
  const index = client.index(DOCS_INDEX);
  
  try {
    const task = await index.addDocuments(documents);
    console.log(`📝 Indexed ${documents.length} documents, task ID: ${task.taskUid}`);
    return task;
  } catch (error) {
    console.error('❌ Failed to index documents:', error);
    throw error;
  }
}

// Remove documents from search index
export async function removeDocuments(docIds: number[]) {
  const client = getMeiliClient();
  const index = client.index(DOCS_INDEX);
  
  try {
    const task = await index.deleteDocuments(docIds);
    console.log(`🗑️ Removed ${docIds.length} documents from index, task ID: ${task.taskUid}`);
    return task;
  } catch (error) {
    console.error('❌ Failed to remove documents from index:', error);
    throw error;
  }
}

// Search documents with faceting
export async function searchDocuments(params: {
  query?: string;
  filter?: string[];
  facets?: string[];
  sort?: string[];
  limit?: number;
  offset?: number;
  attributesToHighlight?: string[];
}) {
  const client = getMeiliClient();
  const index = client.index(DOCS_INDEX);

  try {
    const searchParams: any = {
      limit: params.limit || 20,
      offset: params.offset || 0,
      attributesToHighlight: params.attributesToHighlight || ['doc_name', 'searchable_text'],
      showMatchesPosition: true,
    };

    if (params.filter && params.filter.length > 0) {
      searchParams.filter = params.filter;
    }

    if (params.facets && params.facets.length > 0) {
      searchParams.facets = params.facets;
    }

    if (params.sort && params.sort.length > 0) {
      searchParams.sort = params.sort;
    }

    const results = await index.search(params.query || '', searchParams);
    
    return {
      hits: results.hits,
      totalHits: results.estimatedTotalHits || 0,
      facetDistribution: results.facetDistribution || {},
      processingTimeMs: results.processingTimeMs,
      query: results.query
    };

  } catch (error) {
    console.error('❌ Search failed:', error);
    throw error;
  }
}

// Get search stats and health
export async function getSearchStats() {
  const client = getMeiliClient();
  
  try {
    const stats = await client.getStats();
    const health = await client.health();
    const index = client.index(DOCS_INDEX);
    const indexStats = await index.getStats();
    
    return {
      ...stats,
      health,
      docsIndex: indexStats
    };
  } catch (error) {
    console.error('❌ Failed to get search stats:', error);
    return null;
  }
}