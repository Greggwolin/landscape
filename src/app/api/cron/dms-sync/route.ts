/**
 * DMS Document Sync Cron Job
 * Auto-syncs documents to Meilisearch periodically
 *
 * Deployment:
 * - Vercel Cron: Add to vercel.json:
 *   {
 *     "crons": [{
 *       "path": "/api/cron/dms-sync",
 *       "schedule": "0 * * * *"  // Every hour
 *     }]
 *   }
 *
 * - Manual trigger: POST /api/cron/dms-sync with Authorization header
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncDocumentsToMeili, refreshSearchMV } from '@/lib/dms/indexer';

// Verify cron secret (for manual triggers or external cron services)
function verifyCronAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // In production, require auth
  if (process.env.NODE_ENV === 'production' && !cronSecret) {
    console.warn('⚠️ CRON_SECRET not set in production');
    return false;
  }

  // Allow if no secret configured (dev mode)
  if (!cronSecret) {
    return true;
  }

  // Verify secret matches
  return authHeader === `Bearer ${cronSecret}`;
}

/**
 * POST /api/cron/dms-sync
 * Syncs documents created/updated in the last 2 hours
 */
export async function POST(req: NextRequest) {
  try {
    // Verify authorization
    if (!verifyCronAuth(req)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔄 Starting DMS cron sync...');
    const startTime = Date.now();

    // Sync documents updated in the last 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const meiliCount = await syncDocumentsToMeili({
      sinceDate: twoHoursAgo,
    });

    // Refresh materialized view
    await refreshSearchMV();

    const duration = Date.now() - startTime;

    console.log(`✅ DMS cron sync completed: ${meiliCount} docs in ${duration}ms`);

    return NextResponse.json({
      success: true,
      documentsIndexed: meiliCount,
      durationMs: duration,
      sinceDate: twoHoursAgo.toISOString(),
    });

  } catch (error: any) {
    console.error('❌ DMS cron sync failed:', error);

    return NextResponse.json(
      {
        error: 'Sync failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/dms-sync
 * Get cron job status (for monitoring)
 */
export async function GET() {
  return NextResponse.json({
    job: 'dms-sync',
    schedule: 'Hourly',
    description: 'Syncs DMS documents to Meilisearch and refreshes materialized view',
    configured: !!process.env.CRON_SECRET,
  });
}
