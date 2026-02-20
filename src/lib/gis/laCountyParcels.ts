import type { Feature, FeatureCollection } from 'geojson';

const LA_COUNTY_PARCELS_QUERY_URL =
  'https://public.gis.lacounty.gov/public/rest/services/LACounty_Cache/LACounty_Parcel/MapServer/0/query';

const CACHE_TTL_MS = 5 * 60 * 1000;
const CHUNK_SIZE = 40;

type CacheEntry = {
  feature: Feature;
  expiresAt: number;
};

const parcelCache = new Map<string, CacheEntry>();

const normalizeId = (value: string): string =>
  value.replace(/[^0-9A-Za-z]/g, '').toUpperCase();

const chunkArray = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const buildWhereClause = (values: string[]): string => {
  const quoted = values
    .map((value) => `'${value.replace(/'/g, "''")}'`)
    .join(', ');
  return `(APN IN (${quoted}) OR AIN IN (${quoted}))`;
};

const toFeatureCollection = (features: Feature[]): FeatureCollection => ({
  type: 'FeatureCollection',
  features,
});

const readCachedFeature = (key: string, now: number): Feature | null => {
  const entry = parcelCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= now) {
    parcelCache.delete(key);
    return null;
  }
  return entry.feature;
};

const cacheFeature = (key: string, feature: Feature, now: number) => {
  if (!key) return;
  parcelCache.set(key, {
    feature,
    expiresAt: now + CACHE_TTL_MS,
  });
};

const mergeFeatures = (features: Feature[]): Feature[] => {
  const merged = new Map<string, Feature>();
  features.forEach((feature, index) => {
    const props = (feature.properties ?? {}) as Record<string, unknown>;
    const apn = typeof props.APN === 'string' ? props.APN : '';
    const ain = typeof props.AIN === 'string' ? props.AIN : '';
    const key = normalizeId(apn || ain || String(feature.id ?? index));
    if (!merged.has(key)) {
      merged.set(key, feature);
    }
  });
  return Array.from(merged.values());
};

const fetchWithTimeout = async (url: string, timeoutMs = 10000): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const fetchChunkExternal = async (apns: string[]): Promise<FeatureCollection> => {
  const params = new URLSearchParams({
    f: 'geojson',
    returnGeometry: 'true',
    outFields: 'APN,AIN,SitusFullAddress,UseDescription',
    outSR: '3857',
    where: buildWhereClause(apns),
  });

  const response = await fetchWithTimeout(`${LA_COUNTY_PARCELS_QUERY_URL}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`LA County parcel query failed (${response.status})`);
  }

  return response.json();
};

const fetchChunkViaProxy = async (apns: string[]): Promise<FeatureCollection> => {
  const response = await fetch('/api/gis/la-parcels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apns }),
  });

  if (!response.ok) {
    const preview = await response.text();
    throw new Error(`LA parcel proxy failed (${response.status}): ${preview.slice(0, 120)}`);
  }

  return response.json();
};

export async function fetchParcelsByAPN(apns: string[]): Promise<FeatureCollection> {
  try {
    const trimmed = apns.map((value) => value.trim()).filter(Boolean);
    const unique = Array.from(new Set(trimmed));

    if (unique.length === 0) {
      return toFeatureCollection([]);
    }

    const now = Date.now();
    const cachedFeatures: Feature[] = [];
    const pending: string[] = [];

    unique.forEach((apn) => {
      const cached = readCachedFeature(normalizeId(apn), now);
      if (cached) {
        cachedFeatures.push(cached);
      } else {
        pending.push(apn);
      }
    });

    if (pending.length === 0) {
      return toFeatureCollection(mergeFeatures(cachedFeatures));
    }

    const chunks = chunkArray(pending, CHUNK_SIZE);
    const fetchedFeatures: Feature[] = [];

    for (const chunk of chunks) {
      try {
        const collection = typeof window === 'undefined'
          ? await fetchChunkExternal(chunk)
          : await fetchChunkViaProxy(chunk);

        if (collection?.features?.length) {
          fetchedFeatures.push(...collection.features);
        }
      } catch (error) {
        console.warn('LA County parcel chunk fetch failed:', error);
      }
    }

    const combined = mergeFeatures([...cachedFeatures, ...fetchedFeatures]);

    combined.forEach((feature) => {
      const props = (feature.properties ?? {}) as Record<string, unknown>;
      const apn = typeof props.APN === 'string' ? props.APN : '';
      const ain = typeof props.AIN === 'string' ? props.AIN : '';
      const apnKey = normalizeId(apn);
      const ainKey = normalizeId(ain);
      cacheFeature(apnKey, feature, now);
      cacheFeature(ainKey, feature, now);
    });

    return toFeatureCollection(combined);
  } catch (error) {
    console.warn('LA County parcel fetch failed:', error);
    return toFeatureCollection([]);
  }
}
