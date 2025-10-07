import { NextRequest, NextResponse } from 'next/server';
import { processTextExtractionQueue } from '@/lib/dms/text-extractor';

/**
 * POST /api/cron/text-extraction
 * Cron job to extract text from pending documents
 *
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/text-extraction",
 *     "schedule": "*/15 * * * *"
 *   }]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (optional but recommended)
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (process.env.CRON_SECRET && authHeader !== expectedAuth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Cron] Text extraction job started');

    const result = await processTextExtractionQueue();

    console.log('[Cron] Text extraction job completed:', result);

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Cron] Text extraction job failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Text extraction job failed',
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/text-extraction
 * Manual trigger for testing
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[Manual] Text extraction triggered');

    const result = await processTextExtractionQueue();

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Manual] Text extraction failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Text extraction failed',
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
