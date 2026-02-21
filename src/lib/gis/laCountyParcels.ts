import type { Feature, FeatureCollection, Geometry, Position } from 'geojson';

const LA_COUNTY_PARCELS_QUERY_URL =
  'https://public.gis.lacounty.gov/public/rest/services/LACounty_Cache/LACounty_Parcel/MapServer/0/query';

const CACHE_TTL_MS = 5 * 60 * 1000;
const CHUNK_SIZE = 40;
const BBOX_RECORD_LIMIT = 2000;
const BBOX_MAX_PAGES = 5;

type CacheEntry = {
  feature: Feature;
  expiresAt: number;
};

const parcelCache = new Map<string, CacheEntry>();

const normalizeId = (value: string): string =>
  value.replace(/[^0-9A-Za-z]/g, '').toUpperCase();

const WEB_MERCATOR_LIMIT = 20037508.34;

const mercatorToLngLat = (position: Position): Position => {
  const [x, y, ...rest] = position;
  const lon = (x / WEB_MERCATOR_LIMIT) * 180;
  let lat = (y / WEB_MERCATOR_LIMIT) * 180;
  lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);
  return [lon, lat, ...rest];
};

const samplePosition = (coords: unknown): Position | null => {
  if (!Array.isArray(coords) || coords.length === 0) return null;
  const first = coords[0];
  if (typeof first === 'number') return coords as Position;
  if (Array.isArray(first)) return samplePosition(first);
  return null;
};

const geometryNeedsTransform = (geometry: Geometry | null): boolean => {
  if (!geometry) return false;
  if (geometry.type === 'GeometryCollection') {
    return geometry.geometries.some((geom) => geometryNeedsTransform(geom));
  }
  const sample = samplePosition(geometry.coordinates as unknown);
  if (!sample) return false;
  const [x, y] = sample;
  return Math.abs(x) > 180 || Math.abs(y) > 90;
};

const transformCoordinates = (coords: unknown): unknown => {
  if (!Array.isArray(coords)) return coords;
  const first = coords[0];
  if (typeof first === 'number') {
    return mercatorToLngLat(coords as Position);
  }
  return coords.map((item) => transformCoordinates(item));
};

const transformGeometryToWgs84 = (geometry: Geometry): Geometry => {
  if (geometry.type === 'GeometryCollection') {
    return {
      ...geometry,
      geometries: geometry.geometries.map((geom) =>
        geometryNeedsTransform(geom) ? transformGeometryToWgs84(geom) : geom
      ),
    };
  }

  return {
    ...geometry,
    coordinates: transformCoordinates(geometry.coordinates) as Geometry['coordinates'],
  };
};

const normalizeFeatures = (features: Feature[]): Feature[] => {
  return features.map((feature) => {
    if (!feature.geometry || !geometryNeedsTransform(feature.geometry)) {
      return feature;
    }
    return {
      ...feature,
      geometry: transformGeometryToWgs84(feature.geometry),
    };
  });
};

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

const buildBboxGeometry = (bbox: [number, number, number, number]): string => {
  return bbox.map((value) => value.toFixed(6)).join(',');
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

const fetchBboxExternal = async (bbox: [number, number, number, number]): Promise<FeatureCollection> => {
  const allFeatures: Feature[] = [];
  let offset = 0;
  let page = 0;
  let exceeded = false;

  do {
    const params = new URLSearchParams({
      f: 'geojson',
      returnGeometry: 'true',
      outFields: 'APN,AIN,SitusFullAddress,UseDescription',
      outSR: '3857',
      where: '1=1',
      geometryType: 'esriGeometryEnvelope',
      spatialRel: 'esriSpatialRelIntersects',
      inSR: '4326',
      geometry: buildBboxGeometry(bbox),
      resultRecordCount: String(BBOX_RECORD_LIMIT),
      resultOffset: String(offset),
    });

    const response = await fetchWithTimeout(`${LA_COUNTY_PARCELS_QUERY_URL}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`LA County parcel bbox query failed (${response.status})`);
    }

    const collection = (await response.json()) as FeatureCollection & { exceededTransferLimit?: boolean };
    const pageFeatures = collection?.features ?? [];
    if (pageFeatures.length) {
      allFeatures.push(...pageFeatures);
    }

    exceeded = Boolean(collection?.exceededTransferLimit) || pageFeatures.length === BBOX_RECORD_LIMIT;
    offset += BBOX_RECORD_LIMIT;
    page += 1;
  } while (exceeded && page < BBOX_MAX_PAGES);

  return toFeatureCollection(allFeatures);
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

const fetchBboxViaProxy = async (bbox: [number, number, number, number]): Promise<FeatureCollection> => {
  const response = await fetch('/api/gis/la-parcels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bbox }),
  });

  if (!response.ok) {
    const preview = await response.text();
    throw new Error(`LA parcel proxy bbox failed (${response.status}): ${preview.slice(0, 120)}`);
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

    const normalizedCached = normalizeFeatures(cachedFeatures);
    const normalizedFetched = normalizeFeatures(fetchedFeatures);
    const combined = mergeFeatures([...normalizedCached, ...normalizedFetched]);

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

export async function fetchParcelsByBbox(
  bbox: [number, number, number, number]
): Promise<FeatureCollection> {
  try {
    const collection = typeof window === 'undefined'
      ? await fetchBboxExternal(bbox)
      : await fetchBboxViaProxy(bbox);

    const normalized = normalizeFeatures(collection?.features ?? []);
    const combined = mergeFeatures(normalized);

    const now = Date.now();
    combined.forEach((feature) => {
      const props = (feature.properties ?? {}) as Record<string, unknown>;
      const apn = typeof props.APN === 'string' ? props.APN : '';
      const ain = typeof props.AIN === 'string' ? props.AIN : '';
      cacheFeature(normalizeId(apn), feature, now);
      cacheFeature(normalizeId(ain), feature, now);
    });

    return toFeatureCollection(combined);
  } catch (error) {
    console.warn('LA County parcel bbox fetch failed:', error);
    return toFeatureCollection([]);
  }
}
