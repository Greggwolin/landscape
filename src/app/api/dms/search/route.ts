import { NextRequest, NextResponse } from 'next/server';
import { searchDocuments } from '@/lib/dms/meili';
import { sql } from '@/lib/dms/db';
import { SearchRequestZ } from './schema';

/**
 * Database fallback search using mv_doc_search materialized view
 */
async function databaseSearch(params: any) {
  try {
    const { query, filters, facets: requestedFacets, limit, offset } = params;

    // Build WHERE clause
    const conditions: any[] = [];

    if (filters?.project_id) {
      conditions.push(sql`project_id = ${filters.project_id}`);
    }
    if (filters?.workspace_id) {
      conditions.push(sql`workspace_id = ${filters.workspace_id}`);
    }
    if (filters?.phase_id) {
      conditions.push(sql`phase_id = ${filters.phase_id}`);
    }
    if (filters?.parcel_id) {
      conditions.push(sql`parcel_id = ${filters.parcel_id}`);
    }
    if (filters?.doc_type) {
      conditions.push(sql`doc_type = ${filters.doc_type}`);
    }
    if (filters?.discipline) {
      conditions.push(sql`discipline = ${filters.discipline}`);
    }
    if (filters?.status) {
      conditions.push(sql`status = ${filters.status}`);
    }
    if (filters?.priority) {
      conditions.push(sql`profile_json->>'priority' = ${filters.priority}`);
    }
    if (filters?.doc_date_from) {
      conditions.push(sql`profile_json->>'doc_date' >= ${filters.doc_date_from}`);
    }
    if (filters?.doc_date_to) {
      conditions.push(sql`profile_json->>'doc_date' <= ${filters.doc_date_to}`);
    }
    if (filters?.contract_value_min) {
      conditions.push(sql`(profile_json->>'contract_value')::numeric >= ${filters.contract_value_min}`);
    }
    if (filters?.contract_value_max) {
      conditions.push(sql`(profile_json->>'contract_value')::numeric <= ${filters.contract_value_max}`);
    }
    if (filters?.tags && filters.tags.length > 0) {
      conditions.push(sql`profile_json->'tags' ?| ${filters.tags}`);
    }

    // Full-text search on searchable_text
    if (query && query.trim().length > 0) {
      conditions.push(sql`searchable_text ILIKE ${'%' + query + '%'}`);
    }

    // Build full query
    const whereClause = conditions.length > 0
      ? sql`WHERE ${conditions.reduce((acc, cond, idx) =>
          idx === 0 ? cond : sql`${acc} AND ${cond}`
        )}`
      : sql``;

    // Get documents
    const docs = await sql`
      SELECT
        doc_id,
        project_id,
        workspace_id,
        phase_id,
        parcel_id,
        doc_name,
        doc_type,
        discipline,
        status,
        version_no,
        doc_date,
        contract_value,
        priority,
        profile_json,
        created_at,
        updated_at,
        project_name,
        workspace_name,
        phase_name,
        parcel_name,
        searchable_text
      FROM landscape.mv_doc_search
      ${whereClause}
      ORDER BY updated_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    // Get total count
    const countResult = await sql<{ count: number }[]>`
      SELECT COUNT(*) as count
      FROM landscape.mv_doc_search
      ${whereClause}
    `;
    const totalHits = countResult[0]?.count || 0;

    // Calculate facets (simplified - return counts for each facet value)
    const facetDistribution: any = {};

    if (requestedFacets?.includes('doc_type')) {
      const facetResult = await sql<{ doc_type: string; count: number }[]>`
        SELECT doc_type, COUNT(*) as count
        FROM landscape.mv_doc_search
        ${whereClause}
        GROUP BY doc_type
        ORDER BY count DESC
      `;
      facetDistribution.doc_type = Object.fromEntries(
        facetResult.map(r => [r.doc_type, r.count])
      );
    }

    if (requestedFacets?.includes('discipline')) {
      const facetResult = await sql<{ discipline: string; count: number }[]>`
        SELECT discipline, COUNT(*) as count
        FROM landscape.mv_doc_search
        ${whereClause}
        GROUP BY discipline
        ORDER BY count DESC
      `;
      facetDistribution.discipline = Object.fromEntries(
        facetResult.filter(r => r.discipline).map(r => [r.discipline, r.count])
      );
    }

    if (requestedFacets?.includes('status')) {
      const facetResult = await sql<{ status: string; count: number }[]>`
        SELECT status, COUNT(*) as count
        FROM landscape.mv_doc_search
        ${whereClause}
        GROUP BY status
        ORDER BY count DESC
      `;
      facetDistribution.status = Object.fromEntries(
        facetResult.map(r => [r.status, r.count])
      );
    }

    if (requestedFacets?.includes('project_name')) {
      const facetResult = await sql<{ project_name: string; count: number }[]>`
        SELECT project_name, COUNT(*) as count
        FROM landscape.mv_doc_search
        ${whereClause}
        GROUP BY project_name
        ORDER BY count DESC
      `;
      facetDistribution.project_name = Object.fromEntries(
        facetResult.filter(r => r.project_name).map(r => [r.project_name, r.count])
      );
    }

    return {
      hits: docs,
      totalHits,
      facetDistribution,
      processingTimeMs: 0,
      query: query || '',
      source: 'database',
    };

  } catch (error) {
    console.error('❌ Database search failed:', error);
    throw error;
  }
}

/**
 * GET /api/dms/search (legacy URL params)
 */
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
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

    console.log(`🔍 GET search: q="${query}", project=${projectId}, limit=${limit}`);

    // Use database search for GET requests
    const results = await databaseSearch({
      query,
      filters: {
        project_id: projectId,
        workspace_id: workspaceId,
        doc_type: docType,
        discipline,
        status,
      },
      facets: ['doc_type', 'discipline', 'status', 'project_name'],
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      results: results.hits,
      facets: results.facetDistribution || {},
      totalHits: results.totalHits,
      source: results.source,
      processingTimeMs: results.processingTimeMs,
      query: results.query,
      pagination: {
        limit,
        offset,
        count: results.hits.length,
        totalHits: results.totalHits,
      },
    });

  } catch (error) {
    console.error('❌ GET search error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json({
      success: false,
      error: 'Search failed',
      details: errorMessage
    }, { status: 500 });
  }
}

/**
 * POST /api/dms/search
 * Full-text search with faceting (supports both Meilisearch and database fallback)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate request
    const validated = SearchRequestZ.parse(body);
    const { query, filters, facets, sort, limit, offset, attributesToHighlight, useDatabaseFallback } = validated;

    console.log(`🔍 POST search: query="${query}", filters=${JSON.stringify(filters)}, limit=${limit}, offset=${offset}`);

    let results;

    if (useDatabaseFallback) {
      // Use database fallback
      console.log('📊 Using database fallback search');
      results = await databaseSearch({
        query,
        filters,
        facets,
        limit,
        offset,
      });
    } else {
      // Try Meilisearch
      console.log('🔍 Using Meilisearch');

      // Build Meilisearch filters
      const meiliFilters: string[] = [];

      if (filters?.project_id) {
        meiliFilters.push(`project_id = ${filters.project_id}`);
      }
      if (filters?.workspace_id) {
        meiliFilters.push(`workspace_id = ${filters.workspace_id}`);
      }
      if (filters?.phase_id) {
        meiliFilters.push(`phase_id = ${filters.phase_id}`);
      }
      if (filters?.parcel_id) {
        meiliFilters.push(`parcel_id = ${filters.parcel_id}`);
      }
      if (filters?.doc_type) {
        meiliFilters.push(`doc_type = "${filters.doc_type}"`);
      }
      if (filters?.discipline) {
        meiliFilters.push(`discipline = "${filters.discipline}"`);
      }
      if (filters?.status) {
        meiliFilters.push(`status = "${filters.status}"`);
      }
      if (filters?.priority) {
        meiliFilters.push(`priority = "${filters.priority}"`);
      }
      if (filters?.tags && filters.tags.length > 0) {
        const tagFilters = filters.tags.map(tag => `tags = "${tag}"`).join(' OR ');
        meiliFilters.push(`(${tagFilters})`);
      }
      if (filters?.doc_date_from) {
        meiliFilters.push(`doc_date >= "${filters.doc_date_from}"`);
      }
      if (filters?.doc_date_to) {
        meiliFilters.push(`doc_date <= "${filters.doc_date_to}"`);
      }
      if (filters?.contract_value_min) {
        meiliFilters.push(`contract_value >= ${filters.contract_value_min}`);
      }
      if (filters?.contract_value_max) {
        meiliFilters.push(`contract_value <= ${filters.contract_value_max}`);
      }

      try {
        results = await searchDocuments({
          query,
          filter: meiliFilters.length > 0 ? meiliFilters : undefined,
          facets,
          sort,
          limit,
          offset,
          attributesToHighlight,
        });
        results.source = 'meilisearch';
      } catch (meiliError) {
        console.warn('⚠️ Meilisearch failed, falling back to database:', meiliError);
        results = await databaseSearch({
          query,
          filters,
          facets,
          limit,
          offset,
        });
      }
    }

    console.log(`✅ Search completed: ${results.totalHits} total hits, ${results.hits.length} returned`);

    return NextResponse.json({
      success: true,
      results: results.hits,
      facets: results.facetDistribution || {},
      totalHits: results.totalHits,
      source: results.source,
      processingTimeMs: results.processingTimeMs,
      query: results.query,
      pagination: {
        limit,
        offset,
        count: results.hits.length,
        totalHits: results.totalHits,
      },
    });

  } catch (error: any) {
    console.error('❌ POST search error:', error);

    // Handle Zod validation errors
    if (error.name === 'ZodError') {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Search failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}