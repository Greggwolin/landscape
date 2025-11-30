/**
 * Redfin Client for fetching sold home comparables
 * Uses Redfin's public Stingray API CSV endpoint for sold properties
 */

export interface RedfinComp {
  mlsId: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  price: number;
  sqft: number | null;
  pricePerSqft: number | null;
  lotSize: number | null;
  yearBuilt: number | null;
  beds: number | null;
  baths: number | null;
  soldDate: string;
  latitude: number;
  longitude: number;
  distanceMiles: number;
  url: string | null;
}

export interface RedfinSearchParams {
  latitude: number;
  longitude: number;
  radiusMiles: number;
  propertyType?: 'house' | 'condo' | 'townhouse' | 'all';
  minYearBuilt?: number;
  maxYearBuilt?: number;
  soldWithinDays?: number;
}

const DEFAULT_CONFIG = {
  baseUrl: 'https://www.redfin.com/stingray',
  timeout: 15000,
  maxResults: 350,  // Increased to capture more results across wider search areas
  soldWithinDays: 180
};

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Calculate distance between two lat/lng points using Haversine formula
 */
function calculateDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Generate a bounding box polygon for Redfin GIS query
 */
function generateBoundingBoxPoly(
  centerLat: number,
  centerLng: number,
  radiusMiles: number
): string {
  // Approximate degrees per mile at this latitude
  const latDegPerMile = 1 / 69.0;
  const lngDegPerMile = 1 / (69.0 * Math.cos((centerLat * Math.PI) / 180));

  const latOffset = radiusMiles * latDegPerMile;
  const lngOffset = radiusMiles * lngDegPerMile;

  const north = centerLat + latOffset;
  const south = centerLat - latOffset;
  const east = centerLng + lngOffset;
  const west = centerLng - lngOffset;

  // Redfin expects polygon as: lng lat,lng lat,lng lat,lng lat (closed polygon)
  // Using + instead of space for URL encoding
  return `${west.toFixed(3)}+${north.toFixed(3)},${east.toFixed(3)}+${north.toFixed(3)},${east.toFixed(3)}+${south.toFixed(3)},${west.toFixed(3)}+${south.toFixed(3)},${west.toFixed(3)}+${north.toFixed(3)}`;
}

/**
 * Map Redfin property type to uipt parameter
 */
function getPropertyTypeParam(type?: 'house' | 'condo' | 'townhouse' | 'all'): string {
  switch (type) {
    case 'house':
      return '1';
    case 'condo':
      return '2';
    case 'townhouse':
      return '3';
    case 'all':
    default:
      return '1,2,3,4,5,6,7,8';
  }
}

/**
 * Parse Redfin CSV date format (e.g., "September-25-2025")
 */
function parseRedfinDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null;

  try {
    // Format: "Month-DD-YYYY"
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;

    const monthNames: Record<string, number> = {
      'January': 0, 'February': 1, 'March': 2, 'April': 3,
      'May': 4, 'June': 5, 'July': 6, 'August': 7,
      'September': 8, 'October': 9, 'November': 10, 'December': 11
    };

    const month = monthNames[parts[0]];
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    if (month === undefined || isNaN(day) || isNaN(year)) return null;

    const date = new Date(year, month, day);
    return date.toISOString();
  } catch {
    return null;
  }
}

/**
 * Parse CSV line, handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Parse Redfin CSV response into comp objects
 */
function parseRedfinCSV(
  csvText: string,
  projectLat: number,
  projectLng: number,
  radiusMiles: number,
  minYearBuilt?: number,
  maxYearBuilt?: number
): RedfinComp[] {
  const lines = csvText.split('\n');
  if (lines.length < 2) return [];

  // Skip header and disclaimer line
  const dataLines = lines.slice(2).filter(line => line.trim().length > 0);
  const comps: RedfinComp[] = [];

  for (const line of dataLines) {
    try {
      const fields = parseCSVLine(line);
      if (fields.length < 27) continue;

      // CSV columns (0-indexed):
      // 0: SALE TYPE, 1: SOLD DATE, 2: PROPERTY TYPE, 3: ADDRESS, 4: CITY
      // 5: STATE, 6: ZIP, 7: PRICE, 8: BEDS, 9: BATHS, 10: LOCATION
      // 11: SQUARE FEET, 12: LOT SIZE, 13: YEAR BUILT, 14: DAYS ON MARKET
      // 15: $/SQUARE FEET, 16: HOA/MONTH, 17: STATUS, 18-19: OPEN HOUSE
      // 20: URL, 21: SOURCE, 22: MLS#, 23: FAVORITE, 24: INTERESTED
      // 25: LATITUDE, 26: LONGITUDE

      const saleType = fields[0];
      if (saleType !== 'PAST SALE') continue; // Only include sold properties

      const soldDateStr = fields[1];
      const soldDate = parseRedfinDate(soldDateStr);
      if (!soldDate) continue;

      const price = parseFloat(fields[7]);
      if (isNaN(price) || price <= 0) continue;

      const lat = parseFloat(fields[25]);
      const lng = parseFloat(fields[26]);
      if (isNaN(lat) || isNaN(lng)) continue;

      const sqft = fields[11] ? parseFloat(fields[11]) : null;
      const lotSize = fields[12] ? parseFloat(fields[12]) : null;
      const yearBuilt = fields[13] ? parseInt(fields[13], 10) : null;
      const beds = fields[8] ? parseFloat(fields[8]) : null;
      const baths = fields[9] ? parseFloat(fields[9]) : null;
      const pricePerSqft = sqft && sqft > 0 ? Math.round(price / sqft) : null;

      // Filter by year built
      if (minYearBuilt && yearBuilt && yearBuilt < minYearBuilt) continue;
      if (maxYearBuilt && yearBuilt && yearBuilt > maxYearBuilt) continue;

      // Calculate distance
      const distanceMiles = Math.round(calculateDistanceMiles(projectLat, projectLng, lat, lng) * 100) / 100;

      // Filter by radius (CSV might return properties outside the requested polygon)
      if (distanceMiles > radiusMiles) continue;

      const mlsId = fields[22] || `redfin-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const url = fields[20] || null;

      comps.push({
        mlsId,
        address: fields[3] || '',
        city: fields[4] || '',
        state: fields[5] || '',
        zip: fields[6] || '',
        price,
        sqft: sqft && !isNaN(sqft) ? sqft : null,
        pricePerSqft,
        lotSize: lotSize && !isNaN(lotSize) ? lotSize : null,
        yearBuilt: yearBuilt && !isNaN(yearBuilt) ? yearBuilt : null,
        beds: beds && !isNaN(beds) ? beds : null,
        baths: baths && !isNaN(baths) ? baths : null,
        soldDate,
        latitude: lat,
        longitude: lng,
        distanceMiles,
        url
      });
    } catch (err) {
      // Skip malformed lines
      console.warn('Failed to parse Redfin CSV line:', err);
      continue;
    }
  }

  // Sort by distance from project
  comps.sort((a, b) => a.distanceMiles - b.distanceMiles);

  return comps;
}

/**
 * Fetch sold home comparables from Redfin using CSV endpoint
 */
export async function fetchRedfinComps(params: RedfinSearchParams): Promise<RedfinComp[]> {
  const baseUrl = process.env.REDFIN_BASE_URL || DEFAULT_CONFIG.baseUrl;
  const timeout = parseInt(process.env.REDFIN_TIMEOUT_MS || String(DEFAULT_CONFIG.timeout), 10);
  const maxResults = parseInt(process.env.REDFIN_MAX_RESULTS || String(DEFAULT_CONFIG.maxResults), 10);
  const defaultSoldDays = parseInt(process.env.REDFIN_DEFAULT_SOLD_DAYS || String(DEFAULT_CONFIG.soldWithinDays), 10);

  const soldWithinDays = params.soldWithinDays ?? defaultSoldDays;
  const propertyTypeParam = getPropertyTypeParam(params.propertyType);
  const poly = generateBoundingBoxPoly(params.latitude, params.longitude, params.radiusMiles);

  // Use CSV endpoint for sold properties - it returns actual sold data
  const url = `${baseUrl}/api/gis-csv?al=1&num_homes=${maxResults}&sold_within_days=${soldWithinDays}&status=9&uipt=${propertyTypeParam}&v=8&poly=${poly}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/csv,application/csv,*/*'
      },
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('Redfin API error', { status: response.status, statusText: response.statusText });

      // Check if we got HTML (rate limited or blocked)
      if (errorText.includes('<!DOCTYPE') || errorText.includes('<html')) {
        console.warn('Redfin returned HTML instead of CSV - may be rate limited');
        return [];
      }

      throw new Error(`Redfin API request failed (${response.status})${errorText ? ': ' + errorText : ''}`);
    }

    const csvText = await response.text();

    if (!csvText || csvText.trim().length === 0) {
      return [];
    }

    // Check if response is HTML error page
    if (csvText.includes('<!DOCTYPE') || csvText.includes('<html')) {
      console.warn('Redfin returned HTML instead of CSV');
      return [];
    }

    const comps = parseRedfinCSV(
      csvText,
      params.latitude,
      params.longitude,
      params.radiusMiles,
      params.minYearBuilt,
      params.maxYearBuilt
    );

    return comps;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Redfin API request timed out');
      return [];
    }
    console.error('Redfin API request failed', error);
    // Return empty array instead of throwing - graceful degradation
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Look up Redfin region ID for a location (useful for more targeted searches)
 * This is optional - the CSV endpoint with polygon works without it
 */
export async function getRedfinRegionId(
  searchTerm: string
): Promise<{ regionId: string; regionType: number } | null> {
  const baseUrl = process.env.REDFIN_BASE_URL || DEFAULT_CONFIG.baseUrl;
  const timeout = parseInt(process.env.REDFIN_TIMEOUT_MS || String(DEFAULT_CONFIG.timeout), 10);

  const url = `${baseUrl}/do/location-autocomplete?location=${encodeURIComponent(searchTerm)}&v=2`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json'
      },
      signal: controller.signal
    });

    if (!response.ok) {
      return null;
    }

    const text = await response.text();
    const jsonText = text.replace(/^\{\}&&/, '');

    interface RedfinRegionResponse {
      payload?: {
        sections?: Array<{
          rows?: Array<{
            id?: string;
            type?: number;
          }>;
        }>;
      };
    }

    const data: RedfinRegionResponse = JSON.parse(jsonText);

    const firstRow = data.payload?.sections?.[0]?.rows?.[0];
    if (firstRow?.id && firstRow?.type !== undefined) {
      return {
        regionId: firstRow.id,
        regionType: firstRow.type
      };
    }

    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
