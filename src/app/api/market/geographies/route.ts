import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * GET /api/market/geographies
 *
 * List available geographies for an MSA and data source.
 *
 * Query params:
 *   - msa: MSA code (required, e.g., '38060' for Phoenix)
 *   - source: Data source (default: 'HBACA')
 *   - metric: Metric type (default: 'permits')
 *
 * Response:
 *   {
 *     msa_code: string;
 *     source: string;
 *     metric_type: string;
 *     geographies: Array<{
 *       name: string;
 *       type: string;
 *       first_period: string;
 *       last_period: string;
 *       record_count: number;
 *     }>;
 *   }
 */

type GeographyRow = {
  geography_name: string;
  geography_type: string;
  first_period: string;
  last_period: string;
  record_count: string;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const msa = searchParams.get('msa');
    const source = searchParams.get('source') ?? 'HBACA';
    const metric = searchParams.get('metric') ?? 'permits';

    if (!msa) {
      return NextResponse.json(
        { error: 'msa parameter is required' },
        { status: 400 }
      );
    }

    const rows = await sql<GeographyRow>`
      SELECT
        geography_name,
        geography_type,
        MIN(period_end_date)::text AS first_period,
        MAX(period_end_date)::text AS last_period,
        COUNT(*)::text AS record_count
      FROM landscape.market_activity
      WHERE msa_code = ${msa}
        AND source = ${source}
        AND metric_type = ${metric}
      GROUP BY geography_name, geography_type
      ORDER BY geography_name
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: `No geographies found for MSA ${msa} with source ${source}` },
        { status: 404 }
      );
    }

    const geographies = rows.map((r) => ({
      name: r.geography_name,
      type: r.geography_type,
      first_period: r.first_period,
      last_period: r.last_period,
      record_count: parseInt(r.record_count, 10),
    }));

    return NextResponse.json({
      msa_code: msa,
      source,
      metric_type: metric,
      geographies,
    });
  } catch (error) {
    console.error('market/geographies GET error', error);
    return NextResponse.json(
      { error: 'Failed to fetch geographies' },
      { status: 500 }
    );
  }
}
