import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type ProjectSettingsRow = {
  cpi_series_id: string | null;
};

type RateRow = {
  latest_observation_date: string;
  rate_decimal: string | number | null;
};

function verifyCronAuth(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');

  if (!cronSecret) {
    return true;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

async function fetchSeriesRate(seriesCode: string): Promise<{ rate: number; asOf: string } | null> {
  const rows = await sql<RateRow>`
    WITH target_series AS (
      SELECT ms.series_id
      FROM public.market_series ms
      WHERE ms.series_code = ${seriesCode}
      LIMIT 1
    ),
    ranked AS (
      SELECT
        md.date AS latest_observation_date,
        md.value::numeric AS current_value,
        LAG(md.value, 12) OVER (ORDER BY md.date) AS prior_value,
        ROW_NUMBER() OVER (ORDER BY md.date DESC) AS rn
      FROM target_series ts
      JOIN public.market_data md
        ON md.series_id = ts.series_id
    )
    SELECT
      latest_observation_date,
      CASE
        WHEN prior_value IS NULL OR prior_value = 0 THEN NULL
        ELSE (current_value / prior_value) - 1
      END AS rate_decimal
    FROM ranked
    WHERE rn = 1
  `;

  if (!rows.length) {
    return null;
  }

  const row = rows[0];
  if (row.rate_decimal == null) {
    return null;
  }

  return {
    rate: Number(row.rate_decimal),
    asOf: row.latest_observation_date,
  };
}

async function runSync() {
  const seriesRows = await sql<ProjectSettingsRow>`
    SELECT DISTINCT cpi_series_id
    FROM landscape.tbl_project_settings
    WHERE use_auto_cpi = true
  `;

  const seriesCodes = seriesRows
    .map((row) => row.cpi_series_id ?? 'CPIAUCSL')
    .filter((value, index, self) => Boolean(value) && self.indexOf(value) === index);

  if (!seriesCodes.length) {
    return {
      success: true,
      projectsUpdated: 0,
      series: [],
      message: 'No projects with auto CPI enabled.',
      timestamp: new Date().toISOString(),
    };
  }

  const seriesResults: Array<{
    seriesId: string;
    rateDecimal: number;
    ratePct: number;
    asOf: string;
    projectsUpdated: number;
  }> = [];

  const failures: Array<{ seriesId: string; reason: string }> = [];
  let totalProjectsUpdated = 0;

  for (const seriesCode of seriesCodes) {
    try {
      const rateInfo = await fetchSeriesRate(seriesCode);

      if (!rateInfo) {
        failures.push({
          seriesId: seriesCode,
          reason: 'Insufficient CPI history (need 13+ months) or missing market_data records.',
        });
        continue;
      }

      const updateRows = await sql<{ project_id: number }>`
        UPDATE landscape.tbl_project_settings
        SET
          global_inflation_rate = ${rateInfo.rate},
          last_cpi_sync_date = NOW(),
          updated_at = NOW()
        WHERE use_auto_cpi = true
          AND COALESCE(cpi_series_id, 'CPIAUCSL') = ${seriesCode}
        RETURNING project_id
      `;

      totalProjectsUpdated += updateRows.length;
      seriesResults.push({
        seriesId: seriesCode,
        rateDecimal: rateInfo.rate,
        ratePct: rateInfo.rate * 100,
        asOf: rateInfo.asOf,
        projectsUpdated: updateRows.length,
      });
    } catch (error) {
      console.error('[CPI Sync] Error updating projects for series', seriesCode, error);
      failures.push({
        seriesId: seriesCode,
        reason: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return {
    success: failures.length === 0,
    projectsUpdated: totalProjectsUpdated,
    series: seriesResults,
    failures,
    timestamp: new Date().toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('mode');

  if (mode === 'status') {
    const autoProjects = await sql<{ count: number }>`
      SELECT COUNT(*)::int AS count
      FROM landscape.tbl_project_settings
      WHERE use_auto_cpi = true
    `;

    return NextResponse.json({
      job: 'cpi-sync',
      configured: !!process.env.CRON_SECRET,
      autoProjects: autoProjects[0]?.count ?? 0,
      timestamp: new Date().toISOString(),
    });
  }

  if (!verifyCronAuth(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runSync();
  const status = result.success ? 200 : 207; // 207 Multi-Status for partial failure
  return NextResponse.json(result, { status });
}

export async function POST(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runSync();
  const status = result.success ? 200 : 207;
  return NextResponse.json(result, { status });
}
