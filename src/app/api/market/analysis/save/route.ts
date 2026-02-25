/**
 * POST /api/market/analysis/save
 * Save a generated location analysis (T1/T2/T3) with data snapshot for staleness detection.
 *
 * Extends tbl_narrative_version with approach_type = 'location_t1' | 'location_t2' | 'location_t3'.
 * Auto-increments version_number per project+tier.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

interface TierAnalysis {
  tier: string;
  title: string;
  summary: string;
  sections: Array<{ title: string; content: string }>;
  generatedAt: string;
}

interface DataSnapshot {
  market_data_latest_dates: Record<string, string>;
  document_count: number;
  document_latest_created_at: string | null;
  snapshot_timestamp: string;
}

interface SaveRequest {
  projectId: number;
  tier: 't1' | 't2' | 't3';
  analysis: TierAnalysis;
  dataSnapshot: DataSnapshot;
}

export async function POST(request: NextRequest) {
  try {
    const body: SaveRequest = await request.json();
    const { projectId, tier, analysis, dataSnapshot } = body;

    if (!projectId || !['t1', 't2', 't3'].includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid projectId or tier' },
        { status: 400 },
      );
    }

    const approachType = `location_${tier}`;

    // Get next version number
    const versionResult = await sql`
      SELECT COALESCE(MAX(version_number), 0) as max_version
      FROM landscape.tbl_narrative_version
      WHERE project_id = ${projectId}
        AND approach_type = ${approachType}
    `;
    const nextVersion =
      (parseInt(String(versionResult[0]?.max_version ?? 0)) || 0) + 1;

    // Insert (id uses sequence, Django doesn't set column default)
    const insertResult = await sql`
      INSERT INTO landscape.tbl_narrative_version (
        id, project_id, approach_type, version_number,
        content, content_html, content_plain,
        status, data_snapshot, created_at, updated_at
      ) VALUES (
        nextval('landscape.tbl_narrative_version_id_seq'),
        ${projectId}, ${approachType}, ${nextVersion},
        ${JSON.stringify(analysis)}::jsonb,
        ${analysis.summary || ''},
        ${(analysis.summary || '').replace(/<[^>]*>/g, '')},
        'draft',
        ${JSON.stringify(dataSnapshot)}::jsonb,
        NOW(), NOW()
      )
      RETURNING id, version_number
    `;

    if (!insertResult || insertResult.length === 0) {
      throw new Error('Insert returned no rows');
    }

    return NextResponse.json({
      id: insertResult[0].id,
      version_number: insertResult[0].version_number,
      status: 'saved',
    });
  } catch (err) {
    console.error('Analysis save error:', err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Failed to save analysis',
      },
      { status: 500 },
    );
  }
}
