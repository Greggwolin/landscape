import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * How old the newest underlying observation may be before this job refuses to
 * write anything.
 *
 * CPIAUCSL for month M publishes around the middle of M+1, so in healthy
 * operation the newest observation is between roughly 40 and 72 days old at any
 * given moment. 95 days therefore tolerates one entirely missed release and
 * fires on two -- it flags a stalled ingestion, not the normal publication lag.
 *
 * This exists because the alternative is not "slightly out of date". Measured on
 * 2026-08-23 the newest CPIAUCSL observation was 2026-02-01, 203 days old, and a
 * guardless sync would have rewritten every opted-in project from 3.00% to 2.43%
 * off that reading and reported success.
 */
const MAX_OBSERVATION_AGE_DAYS = 95;

type RateInfo = {
  rate: number;
  asOf: string;
  ageDays: number;
};

type SeriesResult = {
  seriesId: string;
  rateDecimal: number;
  ratePct: number;
  asOf: string;
  projectsUpdated: number;
};

type Declined = {
  seriesId: string;
  asOf: string;
  ageDays: number;
  wouldHaveWritten: number;
  projectsAffected: number;
  reason: string;
};

function verifyCronAuth(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');

  if (!cronSecret) {
    return true;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

/**
 * The driver hands `date` columns back as JS Date objects, not ISO strings, so
 * String(row.date).slice(0, 10) yields "Sun Feb 01" and every downstream parse
 * silently becomes NaN. Normalise explicitly rather than assuming either shape.
 */
function toIsoDate(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }
  return null;
}

function ageInDays(isoDate: string): number {
  const observed = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(observed.getTime())) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.floor((Date.now() - observed.getTime()) / 86_400_000);
}

/**
 * Reads landscape.v_current_cpi_inflation rather than recomputing the trailing-12
 * arithmetic here. That view is the single definition, and it is deliberately not
 * duplicated: the previous inline version ran LAG(value, 12) with no PARTITION BY
 * over a table holding five geographies of CPIAUCSL, so it lagged 12 rows across
 * interleaved geographies instead of 12 months of one -- 1.64% where the correct
 * US-scoped figure was 2.43%.
 */
async function fetchSeriesRate(seriesCode: string): Promise<RateInfo | null> {
  const rows = await sql`
    SELECT latest_observation_date, trailing_12mo_decimal
    FROM landscape.v_current_cpi_inflation
    WHERE series_code = ${seriesCode}
  `;

  if (!rows.length || rows[0].trailing_12mo_decimal == null) {
    return null;
  }

  const asOf = toIsoDate(rows[0].latest_observation_date);
  if (asOf === null) {
    return null;
  }

  return {
    rate: Number(rows[0].trailing_12mo_decimal),
    asOf,
    ageDays: ageInDays(asOf),
  };
}

async function countOptedIn(seriesCode: string): Promise<number> {
  const rows = await sql`
    SELECT COUNT(*)::int AS count
    FROM landscape.tbl_project_settings
    WHERE use_auto_cpi = true
      AND COALESCE(cpi_series_id, 'CPIAUCSL') = ${seriesCode}
  `;
  return rows[0]?.count ?? 0;
}

async function runSync() {
  const seriesRows = await sql`
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
      declined: [],
      failures: [],
      message: 'No projects with auto CPI enabled.',
      timestamp: new Date().toISOString(),
    };
  }

  const seriesResults: SeriesResult[] = [];
  const declined: Declined[] = [];
  const failures: Array<{ seriesId: string; reason: string }> = [];
  let totalProjectsUpdated = 0;

  for (const seriesCode of seriesCodes) {
    try {
      const rateInfo = await fetchSeriesRate(seriesCode);

      if (!rateInfo) {
        failures.push({
          seriesId: seriesCode,
          reason: 'Insufficient CPI history (need 13+ months at US geography) or missing market_data records.',
        });
        continue;
      }

      // Refuse rather than write a stale figure confidently. The projects keep
      // whatever rate they already carry, and the refusal is reported.
      if (rateInfo.ageDays > MAX_OBSERVATION_AGE_DAYS) {
        declined.push({
          seriesId: seriesCode,
          asOf: rateInfo.asOf,
          ageDays: rateInfo.ageDays,
          wouldHaveWritten: Number(rateInfo.rate.toFixed(4)),
          projectsAffected: await countOptedIn(seriesCode),
          reason:
            `Newest ${seriesCode} observation is ${rateInfo.asOf} (${rateInfo.ageDays} days old, ` +
            `limit ${MAX_OBSERVATION_AGE_DAYS}). Declined to write; market ingestion has likely stalled.`,
        });
        console.warn('[CPI Sync] declined -- stale source', {
          seriesCode,
          asOf: rateInfo.asOf,
          ageDays: rateInfo.ageDays,
        });
        continue;
      }

      const updateRows = await sql`
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

  // A declined run is the guard working, not a crash -- but it must never read as
  // a clean success, or it becomes the same silence this job was repaired to end.
  // statusFor() answers 207 whenever anything declined.
  return {
    success: failures.length === 0,
    projectsUpdated: totalProjectsUpdated,
    series: seriesResults,
    declined,
    failures,
    timestamp: new Date().toISOString(),
  };
}

function statusFor(result: { failures: unknown[]; declined: unknown[] }): number {
  // 207 Multi-Status for anything short of "wrote everything it meant to".
  return result.failures.length || result.declined.length ? 207 : 200;
}

async function handle(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runSync();
    return NextResponse.json(result, { status: statusFor(result) });
  } catch (error) {
    // Previously unhandled: runSync threw at its first query for ten months and
    // the route answered with an opaque 500 rather than saying what broke.
    console.error('[CPI Sync] run failed', error);
    return NextResponse.json(
      {
        success: false,
        error: 'CPI sync failed',
        detail: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('mode') === 'status') {
    if (!verifyCronAuth(req)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const autoProjects = await sql`
        SELECT COUNT(*)::int AS count
        FROM landscape.tbl_project_settings
        WHERE use_auto_cpi = true
      `;

      return NextResponse.json({
        job: 'cpi-sync',
        configured: !!process.env.CRON_SECRET,
        autoProjects: autoProjects[0]?.count ?? 0,
        maxObservationAgeDays: MAX_OBSERVATION_AGE_DAYS,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[CPI Sync] status failed', error);
      return NextResponse.json(
        {
          job: 'cpi-sync',
          error: 'Status check failed',
          detail: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 },
      );
    }
  }

  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
