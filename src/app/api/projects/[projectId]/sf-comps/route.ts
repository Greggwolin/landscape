import { NextRequest, NextResponse } from 'next/server';
import { fetchRedfinComps, RedfinComp } from '@/lib/redfinClient';

type Params = { params: { projectId: string } };

export type SfComp = {
  mlsId: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  yearBuilt: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  lotSqft: number | null;
  salePrice: number;
  saleDate: string;
  pricePerSqft: number | null;
  distanceMiles: number;
  url: string | null;
};

export type SfCompsStats = {
  count: number;
  medianPrice: number | null;
  medianPricePerSqft: number | null;
  p25Price: number | null;
  p75Price: number | null;
  avgYearBuilt: number | null;
  priceRange: { min: number | null; max: number | null };
  sqftRange: { min: number | null; max: number | null };
};

export type SfCompsResponse = {
  projectId: number;
  asOfDate: string;
  searchRadiusMiles: number;
  soldWithinDays: number;
  minYearBuilt?: number;
  maxYearBuilt?: number;
  stats: SfCompsStats;
  comps: SfComp[];
};

type ProjectLike = {
  location_lat?: number | null;
  location_lon?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  lat?: number | null;
  lng?: number | null;
  lon?: number | null;
  zip_code?: string | null;
  zipcode?: string | null;
  postal_code?: string | null;
};

const DEFAULT_RADIUS_MILES = 3;
const DEFAULT_SOLD_WITHIN_DAYS = 180;
const DEFAULT_MIN_YEAR_BUILT_OFFSET = 2; // Only include homes built within last 2 years

function parsePositiveInteger(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function parsePositiveNumber(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function extractProjectLocation(project: unknown): { lat: number; lng: number; zip?: string | null } | null {
  if (typeof project !== 'object' || project === null) return null;
  const candidate = project as ProjectLike;
  const lat =
    toNumber(candidate.location_lat) ??
    toNumber(candidate.latitude) ??
    toNumber(candidate.lat);
  const lng =
    toNumber(candidate.location_lon) ??
    toNumber(candidate.longitude) ??
    toNumber(candidate.lng) ??
    toNumber(candidate.lon);

  if (lat === null || lng === null) return null;
  return { lat, lng };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  if (p < 0 || p > 1) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  const weight = idx - lower;
  return sorted[lower] + (sorted[upper] - sorted[lower]) * weight;
}

function normalizeComp(comp: RedfinComp): SfComp {
  return {
    mlsId: comp.mlsId,
    address: comp.address,
    city: comp.city,
    state: comp.state,
    zip: comp.zip,
    lat: comp.latitude,
    lng: comp.longitude,
    yearBuilt: comp.yearBuilt,
    beds: comp.beds,
    baths: comp.baths,
    sqft: comp.sqft,
    lotSqft: comp.lotSize,
    salePrice: comp.price,
    saleDate: comp.soldDate,
    pricePerSqft: comp.pricePerSqft,
    distanceMiles: comp.distanceMiles,
    url: comp.url
  };
}

function calculateStats(comps: SfComp[]): SfCompsStats {
  if (comps.length === 0) {
    return {
      count: 0,
      medianPrice: null,
      medianPricePerSqft: null,
      p25Price: null,
      p75Price: null,
      avgYearBuilt: null,
      priceRange: { min: null, max: null },
      sqftRange: { min: null, max: null }
    };
  }

  const prices = comps.map((c) => c.salePrice).filter((p) => Number.isFinite(p));
  const ppsf = comps
    .map((c) => c.pricePerSqft)
    .filter((p): p is number => p !== null && Number.isFinite(p));
  const sqfts = comps
    .map((c) => c.sqft)
    .filter((s): s is number => s !== null && Number.isFinite(s));
  const years = comps
    .map((c) => c.yearBuilt)
    .filter((y): y is number => y !== null && Number.isFinite(y));

  const avgYear = years.length > 0 ? Math.round(years.reduce((a, b) => a + b, 0) / years.length) : null;

  return {
    count: comps.length,
    medianPrice: median(prices),
    medianPricePerSqft: median(ppsf),
    p25Price: percentile(prices, 0.25),
    p75Price: percentile(prices, 0.75),
    avgYearBuilt: avgYear,
    priceRange: {
      min: prices.length > 0 ? Math.min(...prices) : null,
      max: prices.length > 0 ? Math.max(...prices) : null
    },
    sqftRange: {
      min: sqfts.length > 0 ? Math.min(...sqfts) : null,
      max: sqfts.length > 0 ? Math.max(...sqfts) : null
    }
  };
}

export async function GET(req: NextRequest, context: Params) {
  const { projectId: projectIdRaw } = context.params;
  const projectId = Number.parseInt(projectIdRaw, 10);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 });
  }

  const url = new URL(req.url);

  // Parse query parameters
  const radiusParam = parsePositiveNumber(url.searchParams.get('radius') ?? url.searchParams.get('radiusMiles'));
  if ((url.searchParams.has('radius') || url.searchParams.has('radiusMiles')) && radiusParam === null) {
    return NextResponse.json({ error: 'Invalid radius' }, { status: 400 });
  }

  const daysParam = parsePositiveInteger(url.searchParams.get('days') ?? url.searchParams.get('soldWithinDays'));
  if ((url.searchParams.has('days') || url.searchParams.has('soldWithinDays')) && daysParam === null) {
    return NextResponse.json({ error: 'Invalid days' }, { status: 400 });
  }

  const minYearParam = parsePositiveInteger(url.searchParams.get('minYear') ?? url.searchParams.get('minYearBuilt'));
  if ((url.searchParams.has('minYear') || url.searchParams.has('minYearBuilt')) && minYearParam === null) {
    return NextResponse.json({ error: 'Invalid minYear' }, { status: 400 });
  }

  const maxYearParam = parsePositiveInteger(url.searchParams.get('maxYear') ?? url.searchParams.get('maxYearBuilt'));
  if ((url.searchParams.has('maxYear') || url.searchParams.has('maxYearBuilt')) && maxYearParam === null) {
    return NextResponse.json({ error: 'Invalid maxYear' }, { status: 400 });
  }

  const searchRadiusMiles = radiusParam ?? DEFAULT_RADIUS_MILES;
  const soldWithinDays = daysParam ?? DEFAULT_SOLD_WITHIN_DAYS;

  // Default to homes built within last 2 years if no minYear specified
  const currentYear = new Date().getFullYear();
  const defaultMinYear = currentYear - DEFAULT_MIN_YEAR_BUILT_OFFSET;
  const minYearBuilt = minYearParam ?? defaultMinYear;

  try {
    // Fetch project to get location
    const projectUrl = new URL(`/api/projects/${projectId}`, req.url);
    const projectResponse = await fetch(projectUrl.toString(), { cache: 'no-store' });

    if (projectResponse.status === 404) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    if (!projectResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch project details' }, { status: 502 });
    }

    const projectData = await projectResponse.json();
    const location = extractProjectLocation(projectData);
    if (!location) {
      return NextResponse.json(
        { error: 'Project is missing location (lat/lng)' },
        { status: 400 }
      );
    }

    // Fetch comps from Redfin
    const redfinComps = await fetchRedfinComps({
      latitude: location.lat,
      longitude: location.lng,
      radiusMiles: searchRadiusMiles,
      soldWithinDays,
      minYearBuilt,
      maxYearBuilt: maxYearParam ?? undefined,
      propertyType: 'house'
    });

    // Normalize comps to our format
    const comps = redfinComps.map(normalizeComp);

    // Calculate stats
    const stats = calculateStats(comps);

    const now = new Date();

    const response: SfCompsResponse = {
      projectId,
      asOfDate: now.toISOString(),
      searchRadiusMiles,
      soldWithinDays,
      minYearBuilt,
      ...(maxYearParam && { maxYearBuilt: maxYearParam }),
      stats,
      comps
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    });
  } catch (error) {
    console.error('Failed to fetch comps', error);
    return NextResponse.json(
      { error: 'Failed to fetch comps' },
      { status: 502 }
    );
  }
}
