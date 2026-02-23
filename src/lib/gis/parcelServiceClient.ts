import type { FeatureCollection } from 'geojson';
import type { CountyCode } from './countyServices';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://127.0.0.1:8000';

const emptyFeatureCollection = (): FeatureCollection => ({
  type: 'FeatureCollection',
  features: [],
});

export async function queryParcelsByBounds(
  county: CountyCode,
  bounds: [number, number, number, number],
  headers: Record<string, string>
): Promise<FeatureCollection> {
  try {
    const response = await fetch(`${DJANGO_API_URL}/api/gis/parcel-query/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ county, bounds }),
    });

    if (!response.ok) {
      const payload = await response.text();
      throw new Error(payload || `Parcel query failed (${response.status})`);
    }

    const data = await response.json();
    if (data?.type === 'FeatureCollection' && Array.isArray(data?.features)) {
      return data as FeatureCollection;
    }
  } catch (error) {
    console.warn('Parcel query failed:', error);
  }

  return emptyFeatureCollection();
}

export async function queryParcelById(
  county: CountyCode,
  parcelId: string,
  headers: Record<string, string>
): Promise<FeatureCollection> {
  try {
    const response = await fetch(`${DJANGO_API_URL}/api/gis/parcel-query/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ county, id: parcelId }),
    });

    if (!response.ok) {
      const payload = await response.text();
      throw new Error(payload || `Parcel lookup failed (${response.status})`);
    }

    const data = await response.json();
    if (data?.type === 'FeatureCollection' && Array.isArray(data?.features)) {
      return data as FeatureCollection;
    }
  } catch (error) {
    console.warn('Parcel lookup failed:', error);
  }

  return emptyFeatureCollection();
}
