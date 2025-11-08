import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type InflationRow = {
  series_code: string;
  latest_observation_date: string;
  trailing_12mo_pct_change: string | number | null;
  trailing_12mo_decimal: string | number | null;
};

export async function GET() {
  const fallbackRateEnv =
    process.env.CPI_BASELINE_FALLBACK_RATE ??
    process.env.NEXT_PUBLIC_CPI_BASELINE_FALLBACK_RATE;
  const parsedEnvRate = fallbackRateEnv != null ? Number(fallbackRateEnv) : null;
  const fallbackRate = Number.isFinite(parsedEnvRate) ? parsedEnvRate : 3;
  const fallback = {
    rate: fallbackRate,
    rateDecimal: fallbackRate / 100,
    asOf: new Date().toISOString().slice(0, 10),
    source: 'Fallback CPI Baseline',
    seriesId: 'CPI-FALLBACK',
    updatedAt: new Date().toISOString(),
  };

  if (!process.env.DATABASE_URL && fallback) {
    console.warn('DATABASE_URL not set; serving CPI baseline fallback');
    return NextResponse.json(fallback);
  }

  try {
    const result = await sql<InflationRow>`
      SELECT
        series_code,
        latest_observation_date,
        trailing_12mo_pct_change,
        trailing_12mo_decimal
      FROM landscape.v_current_cpi_inflation
    `;

    if (!result.length) {
      return NextResponse.json(
        {
          error: 'No CPI data available. Ensure market_data contains the CPIAUCSL series with at least 13 months of observations.',
        },
        { status: 404 },
      );
    }

    const row = result[0];
    const ratePct = row.trailing_12mo_pct_change != null ? Number(row.trailing_12mo_pct_change) : null;
    const rateDecimal = row.trailing_12mo_decimal != null ? Number(row.trailing_12mo_decimal) : null;

    if (ratePct == null || rateDecimal == null) {
      return NextResponse.json(
        {
          error: 'CPI data is incomplete; trailing 12-month change could not be derived.',
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      rate: ratePct,
      rateDecimal,
      asOf: row.latest_observation_date,
      source: 'BLS CPI-U (CPIAUCSL)',
      seriesId: row.series_code,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching CPI baseline:', error);
    if (fallback) {
      console.warn('Serving CPI baseline fallback due to error');
      return NextResponse.json(fallback);
    }
    return NextResponse.json(
      {
        error: 'Failed to fetch CPI baseline',
      },
      { status: 500 },
    );
  }
}
