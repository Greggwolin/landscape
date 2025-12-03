import { useQuery } from '@tanstack/react-query';

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

export type SfCompsQuery = {
  radiusMiles?: number;
  soldWithinDays?: number;
  minYearBuilt?: number;
  maxYearBuilt?: number;
};

async function fetchSfComps(projectId: number, params?: SfCompsQuery): Promise<SfCompsResponse> {
  const url = new URL(`/api/projects/${projectId}/sf-comps`, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
  if (params?.radiusMiles !== undefined) {
    url.searchParams.set('radius', String(params.radiusMiles));
  }
  if (params?.soldWithinDays !== undefined) {
    url.searchParams.set('days', String(params.soldWithinDays));
  }
  if (params?.minYearBuilt !== undefined) {
    url.searchParams.set('minYear', String(params.minYearBuilt));
  }
  if (params?.maxYearBuilt !== undefined) {
    url.searchParams.set('maxYear', String(params.maxYearBuilt));
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    cache: 'no-store'
  });

  if (!res.ok) {
    const message = await res.text().catch(() => '');
    const errorMessage = message || `Request failed with status ${res.status}`;
    throw new Error(errorMessage);
  }

  return res.json();
}

export function useSfComps(projectId: number, params?: SfCompsQuery) {
  return useQuery<SfCompsResponse, Error>({
    queryKey: ['sfComps', projectId, params?.radiusMiles, params?.soldWithinDays, params?.minYearBuilt, params?.maxYearBuilt],
    queryFn: () => fetchSfComps(projectId, params),
    enabled: Number.isFinite(projectId) && projectId > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000     // 5 minutes garbage collection
  });
}
