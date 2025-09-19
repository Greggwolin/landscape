import { NextResponse } from 'next/server';
import { searchDocuments } from '@/lib/dms/meili';
import { dmsDb } from '@/lib/dms/db';
import { buildSearchFilters } from '@/lib/dms/indexing';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse search parameters
    const query = searchParams.get('q') || '';
    const projectId = searchParams.get('project_id') ? parseInt(searchParams.get('project_id')!) : undefined;
    const workspaceId = searchParams.get('workspace_id') ? parseInt(searchParams.get('workspace_id')!) : undefined;
    const docType = searchParams.get('doc_type') || undefined;
    const discipline = searchParams.get('discipline') || undefined;
    const status = searchParams.get('status') || undefined;
    const priority = searchParams.get('priority') || undefined;
    const tags = searchParams.get('tags') ? searchParams.get('tags')!.split(',') : undefined;
    const dateFrom = searchParams.get('date_from') || undefined;
    const dateTo = searchParams.get('date_to') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;
    const sort = searchParams.get('sort') ? searchParams.get('sort')!.split(',') : ['created_at:desc'];
    
    // Try Meilisearch first
    try {
      // Build filters
      const filters = buildSearchFilters({
        projectId,
        workspaceId,
        docType,
        discipline,
        status,
        priority,
        tags,
        dateFrom,
        dateTo
      });

      // Define facets to return
      const facets = [
        'doc_type',
        'discipline', 
        'status',
        'priority',
        'tags',
        'project_name',
        'workspace_name'
      ];

      // Search with Meilisearch
      const searchResults = await searchDocuments({
        query,
        filter: filters,
        facets,
        sort,
        limit,
        offset,
        attributesToHighlight: ['doc_name', 'searchable_text']
      });

      return NextResponse.json({
        success: true,
        source: 'meilisearch',
        results: searchResults.hits,
        totalHits: searchResults.totalHits,
        facets: searchResults.facetDistribution,
        processingTimeMs: searchResults.processingTimeMs,
        query: searchResults.query,
        pagination: {
          limit,
          offset,
          hasNext: searchResults.totalHits > offset + limit,
          hasPrev: offset > 0
        }
      });

    } catch (meiliError) {
      console.log('Meilisearch unavailable, falling back to database search:', meiliError);
      
      // Fallback to database search
      const dbResults = await dmsDb.searchDocuments({
        query,
        projectId,
        workspaceId,
        docType,
        discipline,
        status,
        tags,
        dateFrom,
        dateTo,
        limit,
        offset
      });

      // Simple facet calculation for database fallback
      const facets = {};
      if (dbResults.length > 0) {
        // Calculate basic facets from results
        ['doc_type', 'discipline', 'status', 'priority'].forEach(field => {
          facets[field] = {};
          dbResults.forEach((doc: any) => {
            const value = doc[field];
            if (value) {
              facets[field][value] = (facets[field][value] || 0) + 1;
            }
          });
        });
      }

      return NextResponse.json({
        success: true,
        source: 'database_fallback',
        results: dbResults,
        totalHits: dbResults.length, // Approximate
        facets,
        processingTimeMs: 0,
        query,
        pagination: {
          limit,
          offset,
          hasNext: dbResults.length >= limit,
          hasPrev: offset > 0
        }
      });
    }

  } catch (error) {
    console.error('Search API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({
      success: false,
      error: 'Search failed',
      details: errorMessage
    }, { status: 500 });
  }
}