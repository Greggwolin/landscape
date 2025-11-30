/**
 * API client for Market Intel functionality
 *
 * This module provides access to market data series from FRED, Census, etc.
 */

// API base URL (currently using Next.js API routes as proxy)
// const DJANGO_API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

export interface MarketDataPoint {
  date: string;
  value: string | null;
  coverage_note?: string | null;
}

export interface MarketSeries {
  series_code: string;
  series_name: string;
  geo_id: string;
  geo_level: string;
  geo_name: string;
  units: string;
  data: MarketDataPoint[];
}

export interface MarketSeriesResponse {
  series: MarketSeries[];
}

export interface MarketStatsForProject {
  inflation: {
    value: number | null;
    yoy: number | null;
    label: string;
    updatedDate: string;
  };
  treasury10y: {
    value: number | null;
    yoy: number | null;
    label: string;
    updatedDate: string;
  };
  primeRate: {
    value: number | null;
    yoy: number | null;
    label: string;
    updatedDate: string;
  };
  sofr90day: {
    value: number | null;
    yoy: number | null;
    label: string;
    updatedDate: string;
  };
}

/**
 * Helper to extract the latest value from a series
 */
function latestPoint(series: MarketSeries | undefined): number | null {
  if (!series || !series.data.length) return null;
  const last = series.data[series.data.length - 1];
  const value = last.value ? Number(last.value) : null;
  return value !== null && Number.isFinite(value) ? value : null;
}

/**
 * Helper to calculate year-over-year change
 */
function latestYoY(series: MarketSeries | undefined): number | null {
  if (!series || series.data.length < 13) return null;
  const last = series.data[series.data.length - 1];
  const priorIndex = series.data.findIndex(
    (pt) => pt.date.slice(0, 7) === `${Number(last.date.slice(0, 4)) - 1}${last.date.slice(4, 7)}`
  );
  if (priorIndex === -1) return null;
  const current = last.value ? Number(last.value) : null;
  const prior = series.data[priorIndex].value ? Number(series.data[priorIndex].value) : null;
  if (current === null || prior === null || prior === 0) return null;
  return ((current - prior) / prior) * 100;
}

/**
 * Helper to get the most recent date from a series
 */
function latestDate(series: MarketSeries | undefined): string {
  if (!series || !series.data.length) return new Date().toLocaleDateString();
  const last = series.data[series.data.length - 1];
  // Parse YYYY-MM-DD format
  const year = last.date.slice(0, 4);
  const month = last.date.slice(5, 7);
  const day = last.date.slice(8, 10);
  return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString();
}

/**
 * Fetch market statistics for a specific project based on its location
 * This connects to the /api/market/series endpoint used by the Market Intel page
 */
export async function fetchMarketStatsForProject(
  city: string | null | undefined,
  state: string | null | undefined
): Promise<MarketStatsForProject> {
  try {
    console.log('[Market Intel API] Fetching market stats for:', { city, state });

    // First, resolve geography for the project
    if (!city || !state) {
      console.warn('[Market Intel API] No city/state provided, using US-level data');
      // Don't throw - just use US data
      city = null;
      state = null;
    }

    // Get geo IDs for this location
    // Always include broad fallbacks for national data
    const fallbackGeoIds = ['01000US', 'US', '00000US', 'NATION'];
    let geoIds: string[] = [...fallbackGeoIds];

    if (city && state) {
      const geoUrl = `/api/market/geos?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`;
      console.log('[Market Intel API] Fetching geos from:', geoUrl);

      const geoResponse = await fetch(geoUrl);
      console.log('[Market Intel API] Geo response status:', geoResponse.status);

      if (geoResponse.ok) {
        const geoData = await geoResponse.json();
        console.log('[Market Intel API] Geo data received:', geoData);
        if (geoData.base && geoData.base.geo_id) {
          geoIds = [
            geoData.base.geo_id,
            ...geoData.targets.map((t: { geo_id: string }) => t.geo_id),
            ...fallbackGeoIds
          ];
        }
      } else {
        const errorText = await geoResponse.text();
        console.warn('[Market Intel API] Geo lookup failed, using US data:', errorText);
      }
    }

    // Fetch macro series data (inflation, interest rates, etc.)
    const seriesUrl = `/api/market/series?codes=CPIAUCSL,GS10,DPRIME,SOFR&geo_ids=${Array.from(new Set(geoIds)).join(',')}`;
    console.log('[Market Intel API] Fetching series from:', seriesUrl);

    const seriesResponse = await fetch(seriesUrl);
    console.log('[Market Intel API] Series response status:', seriesResponse.status);

    if (!seriesResponse.ok) {
      const errorText = await seriesResponse.text();
      console.error('[Market Intel API] Series fetch failed:', errorText);
      throw new Error('Failed to fetch market series data');
    }

    const seriesData: MarketSeriesResponse = await seriesResponse.json();
    console.log('[Market Intel API] Series data received:', seriesData);

    // Find each series (prioritize most specific geography)
    const findSeries = (codes: string[]): MarketSeries | undefined => {
      const normalizedCodes = codes.map((c) => c.toUpperCase());
      const allSeries = seriesData.series.map((s) => ({
        ...s,
        _code: s.series_code.toUpperCase(),
        _name: s.series_name.toUpperCase(),
      }));

      // Exact matches first
      const exact = allSeries.filter((s) => normalizedCodes.includes(s._code));
      if (exact.length > 0) {
        return exact.sort((a, b) => b.data.length - a.data.length)[0];
      }

      // Fallback: substring match (covers variants like DGS10, DPRIMEAN, PRIME)
      const partial = allSeries.filter((s) =>
        normalizedCodes.some((code) => s._code.includes(code) || code.includes(s._code))
      );
      if (partial.length > 0) {
        return partial.sort((a, b) => b.data.length - a.data.length)[0];
      }

      // Name-based fallback for common variants (e.g., "10-Year Treasury", "Prime Rate")
      const nameMatches = allSeries.filter((s) => {
        const name = s._name;
        return normalizedCodes.some((code) => {
          if (code.includes('GS10') || code.includes('TREAS')) {
            return name.includes('TREASURY') && name.includes('10');
          }
          if (code.includes('PRIME')) {
            return name.includes('PRIME');
          }
          return false;
        });
      });
      if (nameMatches.length > 0) {
        return nameMatches.sort((a, b) => b.data.length - a.data.length)[0];
      }

      return undefined;
    };

    const cpiSeries = findSeries(['CPIAUCSL', 'CPIAUCNS']);
    const treasury10ySeries = findSeries(['GS10', 'DGS10', 'GS10IR']);
    const primeRateSeries = findSeries(['DPRIME', 'DPRIMEAN', 'PRIME']);
    const sofrSeries = findSeries(['SOFR', 'SOFR90DAY']);

    return {
      inflation: {
        value: latestPoint(cpiSeries),
        yoy: latestYoY(cpiSeries),
        label: 'CPI',
        updatedDate: latestDate(cpiSeries),
      },
      treasury10y: {
        value: latestPoint(treasury10ySeries),
        yoy: latestYoY(treasury10ySeries),
        label: '10-Year Treasury',
        updatedDate: latestDate(treasury10ySeries),
      },
      primeRate: {
        value: latestPoint(primeRateSeries),
        yoy: latestYoY(primeRateSeries),
        label: 'Prime Rate',
        updatedDate: latestDate(primeRateSeries),
      },
      sofr90day: {
        value: latestPoint(sofrSeries),
        yoy: latestYoY(sofrSeries),
        label: 'SOFR (90-day)',
        updatedDate: latestDate(sofrSeries),
      },
    };
  } catch (error) {
    console.error('[Market Intel API] Failed to fetch market stats:', error);
    // Return null values on error
    return {
      inflation: { value: null, yoy: null, label: 'CPI', updatedDate: new Date().toLocaleDateString() },
      treasury10y: { value: null, yoy: null, label: '10-Year Treasury', updatedDate: new Date().toLocaleDateString() },
      primeRate: { value: null, yoy: null, label: 'Prime Rate', updatedDate: new Date().toLocaleDateString() },
      sofr90day: { value: null, yoy: null, label: 'SOFR (90-day)', updatedDate: new Date().toLocaleDateString() },
    };
  }
}

export const marketIntelAPI = {
  fetchMarketStatsForProject,
};
