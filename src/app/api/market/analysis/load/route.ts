/**
 * GET /api/market/analysis/load?projectId=123&tier=t1
 * Load the latest saved location analysis for a project+tier.
 *
 * Returns { analysis, version_number, saved_at, data_snapshot } or null if none saved.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const tier = searchParams.get('tier');

    if (!projectId || !['t1', 't2', 't3'].includes(tier || '')) {
      return NextResponse.json(
        { error: 'projectId and valid tier (t1|t2|t3) required' },
        { status: 400 },
      );
    }

    const approachType = `location_${tier}`;

    const result = await sql`
      SELECT id, version_number, content, created_at, data_snapshot
      FROM landscape.tbl_narrative_version
      WHERE project_id = ${projectId}::bigint
        AND approach_type = ${approachType}
      ORDER BY version_number DESC
      LIMIT 1
    `;

    if (!result || result.length === 0) {
      return NextResponse.json(null);
    }

    const row = result[0];
    return NextResponse.json({
      analysis: row.content,
      version_number: row.version_number,
      saved_at: row.created_at,
      data_snapshot: row.data_snapshot,
    });
  } catch (err) {
    console.error('Analysis load error:', err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Failed to load analysis',
      },
      { status: 500 },
    );
  }
}
