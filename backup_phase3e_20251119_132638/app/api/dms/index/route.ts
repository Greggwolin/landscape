/**
 * DMS Indexing API
 * POST /api/dms/index - Trigger manual indexing
 * GET /api/dms/index/stats - Get index statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncDocumentsToMeili, fullReindex, refreshSearchMV } from '@/lib/dms/indexer';
import { getSearchStats, initializeDocsIndex } from '@/lib/dms/meili';
import { z } from 'zod';

const IndexRequestZ = z.object({
  action: z.enum(['sync', 'reindex', 'refresh_mv', 'init_index']),
  filters: z.object({
    projectId: z.number().int().positive().optional(),
    workspaceId: z.number().int().positive().optional(),
    docType: z.string().optional(),
    status: z.string().optional(),
    sinceDate: z.string().optional(), // ISO date
  }).optional(),
});

/**
 * POST /api/dms/index
 * Trigger manual indexing operations
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, filters } = IndexRequestZ.parse(body);

    console.log(`🔧 Indexing action: ${action}, filters:`, filters);

    let result;

    switch (action) {
      case 'sync':
        // Sync documents to Meilisearch
        const count = await syncDocumentsToMeili(
          filters
            ? {
                projectId: filters.projectId,
                workspaceId: filters.workspaceId,
                docType: filters.docType,
                status: filters.status,
                sinceDate: filters.sinceDate ? new Date(filters.sinceDate) : undefined,
              }
            : undefined
        );
        result = { action: 'sync', documentsIndexed: count };
        break;

      case 'reindex':
        // Full reindex (Meilisearch + MV refresh)
        const reindexResult = await fullReindex();
        result = { action: 'reindex', ...reindexResult };
        break;

      case 'refresh_mv':
        // Refresh materialized view only
        await refreshSearchMV();
        result = { action: 'refresh_mv', success: true };
        break;

      case 'init_index':
        // Initialize Meilisearch index configuration
        await initializeDocsIndex();
        result = { action: 'init_index', success: true };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    console.log(`✅ Indexing action completed:`, result);

    return NextResponse.json({
      success: true,
      ...result,
    });

  } catch (error: any) {
    console.error('❌ Indexing error:', error);

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
        error: 'Indexing failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/dms/index/stats
 * Get Meilisearch and index statistics
 */
export async function GET() {
  try {
    const stats = await getSearchStats();

    if (!stats) {
      return NextResponse.json(
        {
          error: 'Meilisearch unavailable',
          message: 'Could not retrieve search statistics',
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      stats,
    });

  } catch (error: any) {
    console.error('❌ Stats error:', error);

    return NextResponse.json(
      {
        error: 'Failed to retrieve stats',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
