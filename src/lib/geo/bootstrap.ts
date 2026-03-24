/**
 * Auto-bootstrap geo_xwalk records for any US city.
 *
 * TypeScript port of services/market_ingest_py/market_ingest/geo_bootstrap.py
 * with added Micropolitan Statistical Area (μSA) support.
 *
 * When a city is not found in geo_xwalk, this module resolves the full
 * geographic hierarchy using Census Bureau APIs and inserts all records:
 *   US → State → MSA/μSA (if applicable) → County → City
 *
 * Data sources:
 *   - Census ACS API: place FIPS resolution (all incorporated places by state)
 *   - Census Geocoder API: county FIPS for a city
 *   - Census CBSA Delineation: county → MSA/μSA mapping (downloaded on first use)
 */

import { sql } from '@/lib/db';
import { ABBR_TO_FIPS, FIPS_TO_ABBR, FIPS_TO_NAME, normalizeState } from './constants';

// ---------------------------------------------------------------------------
// Census API URLs
// ---------------------------------------------------------------------------

const CENSUS_ACS_URL = 'https://api.census.gov/data/2022/acs/acs5';
const CENSUS_GEOCODER_URL = 'https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress';
// Census delineation file URL (for future full CBSA loading)
// https://www2.census.gov/programs-surveys/metro-micro/geographies/reference-files/2023/delineation-files/list1_2023.xls

// ---------------------------------------------------------------------------
// In-memory CBSA cache (loaded from Census delineation file on first use)
// ---------------------------------------------------------------------------

interface CbsaEntry {
  cbsa_code: string;
  cbsa_title: string;
  is_metro: boolean; // true = Metropolitan, false = Micropolitan
}

// County FIPS (5-digit, state+county) -> CbsaEntry
let cbsaCache: Map<string, CbsaEntry> | null = null;

/**
 * Hardcoded CBSA entries for known Micropolitan areas.
 * This covers common cases while the full delineation file loads.
 * Key = 5-digit county FIPS (state+county), Value = CbsaEntry
 */
const MICRO_FALLBACK: Record<string, CbsaEntry> = {
  // Idaho Micropolitans
  '16013': { cbsa_code: '25200', cbsa_title: 'Hailey, ID Micro Area', is_metro: false },
  '16027': { cbsa_code: '39940', cbsa_title: 'Rexburg, ID Micro Area', is_metro: false },
  '16055': { cbsa_code: '33340', cbsa_title: 'Moscow, ID Micro Area', is_metro: false },
  '16065': { cbsa_code: '43300', cbsa_title: 'Sandpoint, ID Micro Area', is_metro: false },
  '16083': { cbsa_code: '46300', cbsa_title: 'Twin Falls, ID Micro Area', is_metro: false },
  // Montana Micropolitans
  '30031': { cbsa_code: '14580', cbsa_title: 'Bozeman, MT Micro Area', is_metro: false },
  '30049': { cbsa_code: '25740', cbsa_title: 'Helena, MT Micro Area', is_metro: false },
  '30063': { cbsa_code: '28060', cbsa_title: 'Kalispell, MT Micro Area', is_metro: false },
  // Colorado Micropolitans
  '08037': { cbsa_code: '20780', cbsa_title: 'Edwards, CO Micro Area', is_metro: false },
  '08097': { cbsa_code: '44460', cbsa_title: 'Steamboat Springs, CO Micro Area', is_metro: false },
  // Wyoming Micropolitans
  '56039': { cbsa_code: '27220', cbsa_title: 'Jackson, WY-ID Micro Area', is_metro: false },
  // Utah Micropolitans
  '49025': { cbsa_code: '25720', cbsa_title: 'Heber, UT Micro Area', is_metro: false },
  '49021': { cbsa_code: '16260', cbsa_title: 'Cedar City, UT Micro Area', is_metro: false },
  '49053': { cbsa_code: '41100', cbsa_title: 'St. George, UT Micro Area', is_metro: false },
};

/**
 * Look up CBSA for a county. Checks the full cache first, then hardcoded fallback.
 */
function getCbsa(stateFips: string, countyFips: string): CbsaEntry | null {
  const key = `${stateFips.padStart(2, '0')}${countyFips.padStart(3, '0')}`;
  if (cbsaCache) {
    return cbsaCache.get(key) ?? MICRO_FALLBACK[key] ?? null;
  }
  return MICRO_FALLBACK[key] ?? null;
}

/**
 * Load the Census CBSA delineation file into memory.
 * This is a tab-delimited text file with columns:
 *   CBSA Code | Metropolitan Division Code | CSA Code | CBSA Title | Metro/Micro |
 *   State FIPS | County FIPS | ...
 *
 * We parse it to build county -> CBSA mappings for both Metro and Micro areas.
 */
async function loadDelineationFile(): Promise<void> {
  if (cbsaCache) return;

  // Use the hardcoded fallback + dynamic Census Geocoder approach.
  // The geocoder returns CBSA info in its response, so we extract it live
  // for counties not in the static map. Future: parse full delineation file.
  console.log('[geo-bootstrap] CBSA delineation: using fallback + dynamic resolution');
  cbsaCache = new Map(Object.entries(MICRO_FALLBACK).map(([k, v]) => [k, v]));
}

// ---------------------------------------------------------------------------
// Census API helpers
// ---------------------------------------------------------------------------

const PLACE_SUFFIX_RE =
  /\s+(city|town|village|borough|CDP|municipality|plantation|city and borough|metropolitan government|unified government|consolidated government|urban county government|city \(balance\))$/i;

function stripPlaceSuffix(name: string): string {
  return name.replace(PLACE_SUFFIX_RE, '').trim();
}

function normalizeCityName(name: string): string {
  let n = stripPlaceSuffix(name).toLowerCase().trim();
  n = n.replace(/\s+/g, ' ');
  n = n.replace(/^st\.?\s+/, 'saint ');
  return n;
}

/**
 * Resolve a city name to its Census place FIPS code.
 */
async function resolvePlaceFips(
  city: string,
  stateFips: string,
): Promise<{ placeFips: string; officialName: string }> {
  const url = `${CENSUS_ACS_URL}?get=NAME&for=place:*&in=state:${stateFips}`;
  console.log(`[geo-bootstrap] Fetching Census places for state ${stateFips}`);

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Census ACS API failed: ${resp.status} ${resp.statusText}`);
  }
  const data: string[][] = await resp.json();
  if (data.length < 2) {
    throw new Error(`No Census places found for state FIPS ${stateFips}`);
  }

  const target = normalizeCityName(city);
  const places: Map<string, { fips: string; official: string }> = new Map();

  for (const row of data.slice(1)) {
    const name = row[0]; // "Phoenix city, Arizona"
    const placeName = name.split(',')[0].trim();
    const placeFips = row[2]; // 5-digit place FIPS
    const norm = normalizeCityName(placeName);
    places.set(norm, { fips: placeFips, official: placeName });
  }

  // 1. Exact match
  const exact = places.get(target);
  if (exact) return { placeFips: exact.fips, officialName: exact.official };

  // 2. Saint expansion
  const altTarget = target.replace(/^st\.?\s+/, 'saint ');
  if (altTarget !== target) {
    const alt = places.get(altTarget);
    if (alt) return { placeFips: alt.fips, officialName: alt.official };
  }

  // 3. Prefix match
  const prefixMatches = Array.from(places.entries()).filter(([k]) => k.startsWith(target));
  if (prefixMatches.length === 1) {
    const [, match] = prefixMatches[0];
    return { placeFips: match.fips, officialName: match.official };
  }
  if (prefixMatches.length > 1) {
    const best = prefixMatches.reduce((a, b) => (a[0].length <= b[0].length ? a : b));
    return { placeFips: best[1].fips, officialName: best[1].official };
  }

  // 4. Reverse prefix
  const revMatches = Array.from(places.entries()).filter(([k]) => target.startsWith(k));
  if (revMatches.length > 0) {
    const best = revMatches.reduce((a, b) => (a[0].length >= b[0].length ? a : b));
    return { placeFips: best[1].fips, officialName: best[1].official };
  }

  throw new Error(
    `Could not resolve place FIPS for '${city}' in state ${stateFips} ` +
      `(${FIPS_TO_ABBR[stateFips] ?? '??'}). Checked ${places.size} Census places.`,
  );
}

/**
 * Resolve which county a city is in via Census Geocoder.
 * Also extracts CBSA information if available in the geocoder response.
 */
async function resolveCountyFips(
  city: string,
  stateAbbr: string,
  stateFips: string,
): Promise<{ countyFips: string; countyName: string; cbsaFromGeocoder?: CbsaEntry }> {
  const addressAttempts = [
    `1 Main St, ${city}, ${stateAbbr}`,
    `100 Main St, ${city}, ${stateAbbr}`,
    `1 Broadway, ${city}, ${stateAbbr}`,
    `${city}, ${stateAbbr}`,
  ];

  for (const address of addressAttempts) {
    try {
      const params = new URLSearchParams({
        address,
        benchmark: 'Public_AR_Current',
        vintage: 'Current_Current',
        format: 'json',
      });
      const resp = await fetch(`${CENSUS_GEOCODER_URL}?${params}`, {
        signal: AbortSignal.timeout(30000),
      });
      if (!resp.ok) continue;
      const result = await resp.json();

      const addressMatches = result?.result?.addressMatches ?? [];
      if (addressMatches.length > 0) {
        const geographies = addressMatches[0]?.geographies ?? {};

        // Extract county
        const counties = geographies['Counties'] ?? [];
        if (counties.length > 0) {
          const county = counties[0];
          const fullFips = county.GEOID || ''; // "16013" (state+county)
          const countyFips = fullFips.slice(2); // "013"
          const countyName = county.NAME || 'Unknown County';

          // Try to extract CBSA from the geocoder response
          let cbsaFromGeocoder: CbsaEntry | undefined;

          // Check for CBSA in Metropolitan/Micropolitan areas
          const cbsaAreas =
            geographies['Metropolitan Statistical Areas'] ??
            geographies['Micropolitan Statistical Areas'] ??
            geographies['Combined Statistical Areas'] ??
            [];

          if (cbsaAreas.length > 0) {
            const cbsaArea = cbsaAreas[0];
            const cbsaCode = cbsaArea.GEOID || cbsaArea.CBSA || '';
            const cbsaName = cbsaArea.NAME || '';
            if (cbsaCode) {
              // Determine metro vs micro from the key name
              const isMicro = !!(geographies['Micropolitan Statistical Areas']?.length > 0);
              cbsaFromGeocoder = {
                cbsa_code: cbsaCode,
                cbsa_title: isMicro ? `${cbsaName} Micro Area` : `${cbsaName} MSA`,
                is_metro: !isMicro,
              };
            }
          }

          console.log(
            `[geo-bootstrap] County resolved: ${city} -> ${countyFips} (${countyName})` +
              (cbsaFromGeocoder ? ` CBSA: ${cbsaFromGeocoder.cbsa_title}` : ' (no CBSA)'),
          );
          return { countyFips, countyName, cbsaFromGeocoder };
        }
      }
    } catch {
      // Try next address
    }
  }

  // Fallback: ACS county-name match
  try {
    const url = `${CENSUS_ACS_URL}?get=NAME&for=county:*&in=state:${stateFips}`;
    const resp = await fetch(url);
    if (resp.ok) {
      const data: string[][] = await resp.json();
      const target = city.toLowerCase();
      for (const row of data.slice(1)) {
        const countyNameFull = row[0]; // "Blaine County, Idaho"
        const countyName = countyNameFull.split(',')[0].trim();
        const countyFips = row[2]; // 3-digit
        if (countyName.toLowerCase().includes(target)) {
          return { countyFips, countyName };
        }
      }
    }
  } catch {
    // Fall through
  }

  throw new Error(
    `Could not resolve county for '${city}, ${stateAbbr}'. ` +
      'Census Geocoder and ACS county-name fallback both failed.',
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GeoXwalkRecord {
  geo_id: string;
  geo_level: string;
  geo_name: string;
  state_fips: string | null;
  county_fips: string | null;
  place_fips: string | null;
  cbsa_code: string | null;
  parent_geo_id: string | null;
  usps_city: string | null;
  usps_state: string | null;
  hierarchy: Record<string, unknown>;
}

export interface BootstrapResult {
  city_geo_id: string;
  geo_level: string;
  geo_name: string;
  records_upserted: number;
  hierarchy: string[];
  has_msa: boolean;
  has_micro: boolean;
  cbsa_name?: string;
}

// ---------------------------------------------------------------------------
// Main bootstrap function
// ---------------------------------------------------------------------------

/**
 * Resolve a US city to its full FIPS hierarchy and seed geo_xwalk.
 *
 * Creates geo_xwalk records for:
 *   US → State → MSA or μSA (if applicable) → County → City
 *
 * Returns metadata about what was created.
 */
export async function bootstrapCity(
  city: string,
  stateInput: string,
): Promise<BootstrapResult> {
  const stateAbbr = normalizeState(stateInput);
  const stateFips = ABBR_TO_FIPS[stateAbbr];
  if (!stateFips) {
    throw new Error(`Unknown state: ${stateInput}`);
  }

  console.log(`[geo-bootstrap] Bootstrapping geo_xwalk for '${city}, ${stateAbbr}'`);

  // Ensure CBSA cache is loaded
  await loadDelineationFile();

  // Step 1: Resolve place FIPS
  const { placeFips, officialName } = await resolvePlaceFips(city, stateFips);

  // Step 2: Resolve county FIPS (+ try to get CBSA from geocoder)
  const { countyFips, countyName, cbsaFromGeocoder } = await resolveCountyFips(
    city,
    stateAbbr,
    stateFips,
  );

  // Step 3: Resolve CBSA — check static lookup first, then geocoder result
  let cbsa = getCbsa(stateFips, countyFips);
  if (!cbsa && cbsaFromGeocoder) {
    cbsa = cbsaFromGeocoder;
    // Cache it for future lookups
    const key = `${stateFips}${countyFips.padStart(3, '0')}`;
    if (cbsaCache) {
      cbsaCache.set(key, cbsa);
    }
  }

  const cbsaCode = cbsa?.cbsa_code ?? null;
  const cbsaTitle = cbsa?.cbsa_title ?? null;
  const isMicro = cbsa ? !cbsa.is_metro : false;

  if (cbsa) {
    console.log(`[geo-bootstrap] CBSA resolved: ${cbsaTitle} (${cbsaCode}) metro=${cbsa.is_metro}`);
  } else {
    console.log(`[geo-bootstrap] No CBSA for county ${stateFips}${countyFips} (non-CBSA area)`);
  }

  // Step 4: Build geo_id values
  const stateGeoId = stateFips;
  const countyGeoId = `${stateFips}${countyFips}`;
  const cbsaGeoId = cbsaCode; // Can be null
  const cityGeoId = `${stateFips}-${placeFips}`;
  const stateName = FIPS_TO_NAME[stateFips] ?? stateAbbr;

  // Step 5: Build hierarchy chain
  const chain: string[] = [cityGeoId, countyGeoId];
  if (cbsaGeoId) {
    chain.push(cbsaGeoId);
  }
  chain.push(stateGeoId, 'US');

  const hierarchy: Record<string, unknown> = {
    chain,
    county: countyGeoId,
    state: stateGeoId,
    us: 'US',
  };
  if (cbsaGeoId) {
    hierarchy[isMicro ? 'micro' : 'msa'] = cbsaGeoId;
  }

  // Step 6: Build records
  const records: GeoXwalkRecord[] = [
    // US
    {
      geo_id: 'US',
      geo_level: 'US',
      geo_name: 'United States',
      state_fips: null,
      county_fips: null,
      place_fips: null,
      cbsa_code: null,
      parent_geo_id: null,
      usps_city: null,
      usps_state: null,
      hierarchy: {},
    },
    // State
    {
      geo_id: stateGeoId,
      geo_level: 'STATE',
      geo_name: stateName,
      state_fips: stateFips,
      county_fips: null,
      place_fips: null,
      cbsa_code: null,
      parent_geo_id: 'US',
      usps_city: null,
      usps_state: stateAbbr,
      hierarchy: { chain: [stateGeoId, 'US'], us: 'US' },
    },
    // County
    {
      geo_id: countyGeoId,
      geo_level: 'COUNTY',
      geo_name: countyName.includes('County') ? countyName : `${countyName} County`,
      state_fips: stateFips,
      county_fips: countyFips,
      place_fips: null,
      cbsa_code: cbsaCode,
      parent_geo_id: stateGeoId,
      usps_city: null,
      usps_state: stateAbbr,
      hierarchy: {
        chain: [countyGeoId, ...(cbsaGeoId ? [cbsaGeoId] : []), stateGeoId, 'US'],
        state: stateGeoId,
        us: 'US',
        ...(cbsaGeoId ? { [isMicro ? 'micro' : 'msa']: cbsaGeoId } : {}),
      },
    },
  ];

  // MSA or MICRO (optional)
  if (cbsaGeoId && cbsaTitle) {
    records.push({
      geo_id: cbsaGeoId,
      geo_level: isMicro ? 'MICRO' : 'MSA',
      geo_name: cbsaTitle,
      state_fips: stateFips,
      county_fips: null,
      place_fips: null,
      cbsa_code: cbsaCode,
      parent_geo_id: stateGeoId,
      usps_city: null,
      usps_state: stateAbbr,
      hierarchy: {
        chain: [cbsaGeoId, stateGeoId, 'US'],
        state: stateGeoId,
        us: 'US',
      },
    });
  }

  // City
  records.push({
    geo_id: cityGeoId,
    geo_level: 'CITY',
    geo_name: officialName,
    state_fips: stateFips,
    county_fips: countyFips,
    place_fips: placeFips,
    cbsa_code: cbsaCode,
    parent_geo_id: countyGeoId,
    usps_city: city,
    usps_state: stateAbbr,
    hierarchy,
  });

  // Step 7: Upsert all records
  await upsertGeoRecords(records);

  console.log(
    `[geo-bootstrap] Bootstrapped: ${cityGeoId} (${officialName}) -> ` +
      `county=${countyGeoId}, cbsa=${cbsaGeoId ?? 'none'}, state=${stateGeoId}`,
  );

  // Step 8: Fire-and-forget market data seed (FRED API for state + county)
  // Don't await — let it run in the background so we don't block the geo response
  import('./market-seed').then(({ seedMarketData }) => {
    seedMarketData(stateFips, countyFips, cbsaCode ?? undefined)
      .then((result) => {
        console.log(
          `[geo-bootstrap] Market seed complete: ${result.seriesFetched} series, ${result.rowsInserted} rows`,
        );
      })
      .catch((err) => {
        console.warn('[geo-bootstrap] Market seed failed (non-fatal):', err);
      });
  }).catch(() => {});

  return {
    city_geo_id: cityGeoId,
    geo_level: 'CITY',
    geo_name: officialName,
    records_upserted: records.length,
    hierarchy: chain,
    has_msa: cbsa ? cbsa.is_metro : false,
    has_micro: isMicro,
    cbsa_name: cbsaTitle ?? undefined,
  };
}

/**
 * Upsert geo_xwalk records using ON CONFLICT.
 */
async function upsertGeoRecords(records: GeoXwalkRecord[]): Promise<void> {
  for (const rec of records) {
    await sql`
      INSERT INTO public.geo_xwalk (
        geo_id, geo_level, geo_name, state_fips, county_fips,
        place_fips, cbsa_code, parent_geo_id, usps_city, usps_state,
        hierarchy, created_at, updated_at
      )
      VALUES (
        ${rec.geo_id}, ${rec.geo_level}, ${rec.geo_name},
        ${rec.state_fips}, ${rec.county_fips}, ${rec.place_fips},
        ${rec.cbsa_code}, ${rec.parent_geo_id}, ${rec.usps_city},
        ${rec.usps_state}, ${JSON.stringify(rec.hierarchy)}::jsonb,
        NOW(), NOW()
      )
      ON CONFLICT (geo_id) DO UPDATE SET
        geo_name = EXCLUDED.geo_name,
        geo_level = EXCLUDED.geo_level,
        state_fips = COALESCE(EXCLUDED.state_fips, public.geo_xwalk.state_fips),
        county_fips = COALESCE(EXCLUDED.county_fips, public.geo_xwalk.county_fips),
        place_fips = COALESCE(EXCLUDED.place_fips, public.geo_xwalk.place_fips),
        cbsa_code = COALESCE(EXCLUDED.cbsa_code, public.geo_xwalk.cbsa_code),
        parent_geo_id = COALESCE(EXCLUDED.parent_geo_id, public.geo_xwalk.parent_geo_id),
        usps_city = COALESCE(EXCLUDED.usps_city, public.geo_xwalk.usps_city),
        usps_state = COALESCE(EXCLUDED.usps_state, public.geo_xwalk.usps_state),
        hierarchy = CASE
          WHEN EXCLUDED.hierarchy::text != '{}'
          THEN EXCLUDED.hierarchy
          ELSE public.geo_xwalk.hierarchy
        END,
        updated_at = NOW()
    `;
  }
  console.log(`[geo-bootstrap] Upserted ${records.length} geo_xwalk records`);
}
