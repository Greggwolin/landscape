import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * GET /api/market/activity/compare
 *
 * Compare market activity data across multiple geographies.
 *
 * Query params:
 *   - msa: MSA code (required, e.g., '38060' for Phoenix)
 *   - geographies: Comma-separated geography names (required, e.g., 'Buckeye,Surprise,Peoria')
 *   - metric: Metric type (default: 'permits')
 *   - source: Data source (default: 'HBACA')
 *   - months: Number of months to return (default: 12)
 *
 * Response:
 *   {
 *     msa_code: string;
 *     metric_type: string;
 *     source: string;
 *     geographies: string[];
 *     data: Array<{ period_end: string; [geography]: number }>;
 *   }
 */

type ActivityRow = {
  geography_name: string;
  period_end_date: string;
  value: number;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const msa = searchParams.get('msa');
    const geographiesParam = searchParams.get('geographies');
    const metric = searchParams.get('metric') ?? 'permits';
    const source = searchParams.get('source') ?? 'HBACA';
    const monthsParam = searchParams.get('months');
    const months = monthsParam ? parseInt(monthsParam, 10) : 12;

    if (!msa) {
      return NextResponse.json(
        { error: 'msa parameter is required' },
        { status: 400 }
      );
    }

    if (!geographiesParam) {
      return NextResponse.json(
        { error: 'geographies parameter is required (comma-separated list)' },
        { status: 400 }
      );
    }

    const geographies = geographiesParam.split(',').map((g) => g.trim());

    if (geographies.length === 0) {
      return NextResponse.json(
        { error: 'At least one geography is required' },
        { status: 400 }
      );
    }

    if (geographies.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 geographies allowed for comparison' },
        { status: 400 }
      );
    }

    // Fetch data for all geographies
    // Get the most recent N months across all geographies
    const rows = await sql<ActivityRow>`
      WITH recent_periods AS (
        SELECT DISTINCT period_end_date
        FROM landscape.market_activity
        WHERE msa_code = ${msa}
          AND source = ${source}
          AND metric_type = ${metric}
          AND geography_name = ANY(${geographies})
        ORDER BY period_end_date DESC
        LIMIT ${months}
      )
      SELECT
        ma.geography_name,
        ma.period_end_date::text,
        ma.value
      FROM landscape.market_activity ma
      JOIN recent_periods rp ON ma.period_end_date = rp.period_end_date
      WHERE ma.msa_code = ${msa}
        AND ma.source = ${source}
        AND ma.metric_type = ${metric}
        AND ma.geography_name = ANY(${geographies})
      ORDER BY ma.period_end_date DESC, ma.geography_name
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: `No data found for requested geographies in MSA ${msa}` },
        { status: 404 }
      );
    }

    // Group by period and pivot geographies into columns
    const byPeriod = new Map<string, Record<string, number>>();

    for (const row of rows) {
      if (!byPeriod.has(row.period_end_date)) {
        byPeriod.set(row.period_end_date, {});
      }
      byPeriod.get(row.period_end_date)![row.geography_name] = row.value;
    }

    // Convert to array sorted by date descending
    const data = Array.from(byPeriod.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([period, values]) => ({
        period_end: period,
        ...values,
      }));

    // Find which geographies actually had data
    const foundGeographies = new Set<string>();
    for (const row of rows) {
      foundGeographies.add(row.geography_name);
    }

    return NextResponse.json({
      msa_code: msa,
      metric_type: metric,
      source,
      geographies: Array.from(foundGeographies).sort(),
      data,
    });
  } catch (error) {
    console.error('market/activity/compare GET error', error);
    return NextResponse.json(
      { error: 'Failed to fetch market activity comparison' },
      { status: 500 }
    );
  }
}
