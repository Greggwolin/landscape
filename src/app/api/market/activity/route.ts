import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * GET /api/market/activity
 *
 * Query market activity data (permits, closings, etc.) for a single geography.
 *
 * Query params:
 *   - msa: MSA code (required, e.g., '38060' for Phoenix)
 *   - geography: Geography name (required, e.g., 'Buckeye')
 *   - metric: Metric type (default: 'permits')
 *   - source: Data source (default: 'HBACA')
 *   - months: Number of months to return (default: 24)
 *
 * Response:
 *   {
 *     msa_code: string;
 *     geography_name: string;
 *     geography_type: string;
 *     metric_type: string;
 *     source: string;
 *     period_type: string;
 *     last_period: string;
 *     data: Array<{ period_end: string; value: number }>;
 *     stats: {
 *       avg_12mo: number;
 *       avg_24mo: number;
 *       yoy_change: number | null;
 *       peak_period: string;
 *       peak_value: number;
 *     };
 *   }
 */

type ActivityRow = {
  period_end_date: string;
  value: number;
  geography_type: string;
  period_type: string;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const msa = searchParams.get('msa');
    const geography = searchParams.get('geography');
    const metric = searchParams.get('metric') ?? 'permits';
    const source = searchParams.get('source') ?? 'HBACA';
    const monthsParam = searchParams.get('months');
    const months = monthsParam ? parseInt(monthsParam, 10) : 24;

    if (!msa) {
      return NextResponse.json(
        { error: 'msa parameter is required' },
        { status: 400 }
      );
    }

    if (!geography) {
      return NextResponse.json(
        { error: 'geography parameter is required' },
        { status: 400 }
      );
    }

    // Fetch data for the geography
    const rows = await sql<ActivityRow>`
      SELECT
        period_end_date::text,
        value,
        geography_type,
        period_type
      FROM landscape.market_activity
      WHERE msa_code = ${msa}
        AND source = ${source}
        AND metric_type = ${metric}
        AND geography_name = ${geography}
      ORDER BY period_end_date DESC
      LIMIT ${months}
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: `No data found for ${geography} in MSA ${msa}` },
        { status: 404 }
      );
    }

    const geographyType = rows[0].geography_type;
    const periodType = rows[0].period_type;
    const lastPeriod = rows[0].period_end_date;

    // Format data array
    const data = rows.map((r) => ({
      period_end: r.period_end_date,
      value: r.value,
    }));

    // Calculate stats
    const values = rows.map((r) => r.value);

    // Avg 12mo (most recent 12)
    const recent12 = values.slice(0, 12);
    const avg12mo = recent12.length > 0
      ? Math.round(recent12.reduce((a, b) => a + b, 0) / recent12.length)
      : 0;

    // Avg 24mo (most recent 24)
    const recent24 = values.slice(0, 24);
    const avg24mo = recent24.length > 0
      ? Math.round(recent24.reduce((a, b) => a + b, 0) / recent24.length)
      : 0;

    // YoY change: compare most recent month to same month last year
    let yoyChange: number | null = null;
    if (rows.length >= 13) {
      const current = rows[0].value;
      const lastYear = rows[12].value;
      if (lastYear > 0) {
        yoyChange = Math.round(((current - lastYear) / lastYear) * 100) / 100;
      }
    }

    // Peak (all-time from fetched data)
    // Need to query all data for peak
    const peakRows = await sql<{ period_end_date: string; value: number }>`
      SELECT period_end_date::text, value
      FROM landscape.market_activity
      WHERE msa_code = ${msa}
        AND source = ${source}
        AND metric_type = ${metric}
        AND geography_name = ${geography}
      ORDER BY value DESC
      LIMIT 1
    `;

    const peakPeriod = peakRows[0]?.period_end_date ?? lastPeriod;
    const peakValue = peakRows[0]?.value ?? values[0] ?? 0;

    return NextResponse.json({
      msa_code: msa,
      geography_name: geography,
      geography_type: geographyType,
      metric_type: metric,
      source,
      period_type: periodType,
      last_period: lastPeriod,
      data,
      stats: {
        avg_12mo: avg12mo,
        avg_24mo: avg24mo,
        yoy_change: yoyChange,
        peak_period: peakPeriod,
        peak_value: peakValue,
      },
    });
  } catch (error) {
    console.error('market/activity GET error', error);
    return NextResponse.json(
      { error: 'Failed to fetch market activity data' },
      { status: 500 }
    );
  }
}
