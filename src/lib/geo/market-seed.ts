/**
 * Auto-seed market_data for a geographic hierarchy.
 *
 * Fetches key economic indicators from FRED API for state-level data
 * and inserts into market_data table. This provides baseline Population,
 * Employment, Unemployment, and Income data for the Economic Indicators
 * panel on the Location tab.
 *
 * Called as fire-and-forget after geo_xwalk bootstrap completes.
 *
 * FRED series used (all freely available with API key):
 *   - {STATE}UR                         → State unemployment rate (LAUS)
 *   - {STATE}NA                         → State nonfarm employment (CES)
 *   - {STATE}POP                        → State population (annual)
 *   - MEHOINUS{STATE}A646N              → State median household income
 *   - LAUCN{5-FIPS}0000000005           → County employment (LAUS)
 *   - LAUCN{5-FIPS}0000000003           → County unemployment rate (LAUS)
 */

import { sql } from '@/lib/db';
import { ABBR_TO_FIPS, FIPS_TO_ABBR } from './constants';

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';

interface FredObservation {
  date: string;
  value: string;
}

// ---------------------------------------------------------------------------
// Series definitions: series_code → FRED code template + metadata
// ---------------------------------------------------------------------------

interface SeriesDef {
  /** series_code in market_series table (used for lookup/creation) */
  seriesCode: string;
  /** How to build the FRED API series code */
  fredCode: (ctx: GeoContext) => string;
  /** Geo level this series applies to */
  level: 'STATE' | 'COUNTY';
  /** Metadata for auto-creating market_series row if missing */
  meta: {
    seriesName: string;
    category: string;
    subcategory: string;
    units: string;
    frequency: string;
    seasonal: string;
    source: string;
    coverageLevel: string;
  };
}

interface GeoContext {
  stateAbbr: string;
  stateFips: string;
  countyFips?: string;
  cbsaCode?: string;
}

const STATE_SERIES: SeriesDef[] = [
  {
    seriesCode: 'LAUS_STATE_UNRATE',
    fredCode: (ctx) => `${ctx.stateAbbr}UR`,
    level: 'STATE',
    meta: {
      seriesName: 'State Unemployment Rate',
      category: 'LABOR',
      subcategory: 'UNEMPLOYMENT',
      units: 'Percent',
      frequency: 'M',
      seasonal: 'SA',
      source: 'BLS',
      coverageLevel: 'STATE',
    },
  },
  {
    seriesCode: 'CES_STATE_TOTAL',
    fredCode: (ctx) => `${ctx.stateAbbr}NA`,
    level: 'STATE',
    meta: {
      seriesName: 'State Total Nonfarm Payroll Employment',
      category: 'LABOR',
      subcategory: 'EMPLOYMENT',
      units: 'Thousands',
      frequency: 'M',
      seasonal: 'SA',
      source: 'FRED',
      coverageLevel: 'STATE',
    },
  },
  {
    seriesCode: 'POP_STATE',
    fredCode: (ctx) => `${ctx.stateAbbr}POP`,
    level: 'STATE',
    meta: {
      seriesName: 'State Population',
      category: 'DEMOGRAPHICS',
      subcategory: 'POPULATION',
      units: 'Thousands',
      frequency: 'A',
      seasonal: 'NSA',
      source: 'FRED',
      coverageLevel: 'STATE',
    },
  },
  {
    seriesCode: 'MEHI_STATE',
    fredCode: (ctx) => `MEHOINUS${ctx.stateAbbr}A646N`,
    level: 'STATE',
    meta: {
      seriesName: 'State Median Household Income',
      category: 'INCOME',
      subcategory: 'HOUSEHOLD_INCOME',
      units: 'Dollars',
      frequency: 'A',
      seasonal: 'NSA',
      source: 'FRED',
      coverageLevel: 'STATE',
    },
  },
];

const COUNTY_SERIES: SeriesDef[] = [
  {
    seriesCode: 'LAUS_COUNTY_UNRATE',
    fredCode: (ctx) => `LAUCN${ctx.stateFips}${ctx.countyFips}0000000003`,
    level: 'COUNTY',
    meta: {
      seriesName: 'County Unemployment Rate',
      category: 'LABOR',
      subcategory: 'UNEMPLOYMENT',
      units: 'Percent',
      frequency: 'M',
      seasonal: 'NSA',
      source: 'BLS',
      coverageLevel: 'COUNTY',
    },
  },
  {
    seriesCode: 'LAUS_COUNTY_EMP',
    fredCode: (ctx) => `LAUCN${ctx.stateFips}${ctx.countyFips}0000000005`,
    level: 'COUNTY',
    meta: {
      seriesName: 'County Employment Level',
      category: 'LABOR',
      subcategory: 'EMPLOYMENT',
      units: 'Persons',
      frequency: 'M',
      seasonal: 'NSA',
      source: 'BLS',
      coverageLevel: 'COUNTY',
    },
  },
];

// ---------------------------------------------------------------------------
// Series ID resolver — looks up or creates market_series row
// ---------------------------------------------------------------------------

const seriesIdCache = new Map<string, number>();

async function resolveSeriesId(def: SeriesDef): Promise<number | null> {
  const cached = seriesIdCache.get(def.seriesCode);
  if (cached) return cached;

  // Try to find existing
  const existing = await sql`
    SELECT series_id FROM public.market_series
    WHERE series_code = ${def.seriesCode}
    LIMIT 1
  `;

  if (existing.length > 0) {
    const id = Number(existing[0].series_id);
    seriesIdCache.set(def.seriesCode, id);
    return id;
  }

  // Auto-create the series entry
  try {
    const inserted = await sql`
      INSERT INTO public.market_series (
        series_code, series_name, category, subcategory,
        units, frequency, seasonal, source, coverage_level
      ) VALUES (
        ${def.seriesCode}, ${def.meta.seriesName}, ${def.meta.category}, ${def.meta.subcategory},
        ${def.meta.units}, ${def.meta.frequency}, ${def.meta.seasonal}, ${def.meta.source}, ${def.meta.coverageLevel}
      )
      ON CONFLICT (series_code, seasonal)
      DO UPDATE SET series_name = EXCLUDED.series_name
      RETURNING series_id
    `;
    if (inserted.length > 0) {
      const id = Number(inserted[0].series_id);
      seriesIdCache.set(def.seriesCode, id);
      console.log(`[market-seed] Created market_series '${def.seriesCode}' → id=${id}`);
      return id;
    }
  } catch (err) {
    console.warn(`[market-seed] Failed to create market_series '${def.seriesCode}':`, err);
  }

  return null;
}

// ---------------------------------------------------------------------------
// FRED API fetcher
// ---------------------------------------------------------------------------

async function fetchFredSeries(
  fredSeriesCode: string,
  apiKey: string,
  startDate = '2015-01-01',
): Promise<FredObservation[]> {
  const params = new URLSearchParams({
    series_id: fredSeriesCode,
    api_key: apiKey,
    file_type: 'json',
    observation_start: startDate,
    sort_order: 'asc',
  });

  const url = `${FRED_BASE}?${params}`;
  console.log(`[market-seed] Fetching FRED: ${fredSeriesCode}`);

  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) {
      console.warn(`[market-seed] FRED ${fredSeriesCode}: ${resp.status} ${resp.statusText}`);
      return [];
    }
    const data = await resp.json();
    const observations: FredObservation[] = (data.observations ?? []).filter(
      (obs: FredObservation) => obs.value !== '.' && obs.value !== '',
    );
    console.log(`[market-seed] FRED ${fredSeriesCode}: ${observations.length} observations`);
    return observations;
  } catch (err) {
    console.warn(`[market-seed] FRED ${fredSeriesCode} failed:`, err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Batch insert helper
// ---------------------------------------------------------------------------

async function insertObservations(
  seriesId: number,
  geoId: string,
  observations: FredObservation[],
): Promise<number> {
  let inserted = 0;
  // Batch in chunks of 50 to avoid overwhelming the connection
  const chunkSize = 50;
  for (let i = 0; i < observations.length; i += chunkSize) {
    const chunk = observations.slice(i, i + chunkSize);
    for (const o of chunk) {
      await sql`
        INSERT INTO public.market_data (series_id, geo_id, date, value, rev_tag, created_at)
        VALUES (${seriesId}, ${geoId}, ${o.date}::date, ${parseFloat(o.value)}, 'auto_seed', NOW())
        ON CONFLICT (series_id, geo_id, date) DO NOTHING
      `;
    }
    inserted += chunk.length;
  }
  return inserted;
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

/**
 * Seed market_data for a geographic hierarchy.
 * Fetches FRED data for state + county levels and inserts into market_data.
 *
 * @param stateFipsOrAbbr - State FIPS code (e.g., "16") or abbreviation (e.g., "ID")
 * @param countyFips - 3-digit county FIPS (e.g., "013") — optional
 * @param cbsaCode - CBSA code for MSA/μSA (e.g., "25200") — optional (currently unused, for future)
 */
export async function seedMarketData(
  stateFipsOrAbbr: string,
  countyFips?: string,
  cbsaCode?: string,
): Promise<{ seriesFetched: number; rowsInserted: number }> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    console.warn('[market-seed] No FRED_API_KEY set — skipping market data seed');
    return { seriesFetched: 0, rowsInserted: 0 };
  }

  // Normalize input
  let stateFips: string;
  let stateAbbr: string;
  if (stateFipsOrAbbr.length === 2 && /^\d+$/.test(stateFipsOrAbbr)) {
    stateFips = stateFipsOrAbbr;
    stateAbbr = FIPS_TO_ABBR[stateFips] ?? '';
  } else {
    stateAbbr = stateFipsOrAbbr.toUpperCase();
    stateFips = ABBR_TO_FIPS[stateAbbr] ?? '';
  }

  if (!stateFips || !stateAbbr) {
    console.warn(`[market-seed] Invalid state: ${stateFipsOrAbbr}`);
    return { seriesFetched: 0, rowsInserted: 0 };
  }

  const ctx: GeoContext = { stateAbbr, stateFips, countyFips, cbsaCode };
  const stateGeoId = stateFips;
  const countyGeoId = countyFips ? `${stateFips}${countyFips}` : undefined;

  // Check if state already has market data — skip if populated
  const existing = await sql`
    SELECT COUNT(*)::text AS cnt FROM public.market_data WHERE geo_id = ${stateGeoId}
  `;
  if (Number(existing[0]?.cnt) > 20) {
    console.log(`[market-seed] State ${stateAbbr} already has ${existing[0].cnt} rows — skipping`);
    return { seriesFetched: 0, rowsInserted: 0 };
  }

  let totalRows = 0;
  let totalSeries = 0;

  // Fetch state-level series
  for (const def of STATE_SERIES) {
    const seriesId = await resolveSeriesId(def);
    if (!seriesId) {
      console.warn(`[market-seed] Could not resolve series_id for ${def.seriesCode} — skipping`);
      continue;
    }
    const fredCode = def.fredCode(ctx);
    const obs = await fetchFredSeries(fredCode, apiKey);
    if (obs.length > 0) {
      totalSeries++;
      const inserted = await insertObservations(seriesId, stateGeoId, obs);
      totalRows += inserted;
    }
  }

  // Fetch county-level series (if county provided)
  if (countyGeoId && countyFips) {
    for (const def of COUNTY_SERIES) {
      const seriesId = await resolveSeriesId(def);
      if (!seriesId) {
        console.warn(`[market-seed] Could not resolve series_id for ${def.seriesCode} — skipping`);
        continue;
      }
      const fredCode = def.fredCode(ctx);
      const obs = await fetchFredSeries(fredCode, apiKey);
      if (obs.length > 0) {
        totalSeries++;
        const inserted = await insertObservations(seriesId, countyGeoId, obs);
        totalRows += inserted;
      }
    }
  }

  console.log(`[market-seed] Seeded ${totalRows} rows across ${totalSeries} series for ${stateAbbr}${countyFips ? `/${countyFips}` : ''}`);
  return { seriesFetched: totalSeries, rowsInserted: totalRows };
}
