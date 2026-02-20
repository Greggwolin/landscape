import { NextResponse } from 'next/server';
import type { FeatureCollection } from 'geojson';
import { fetchParcelsByAPN } from '@/lib/gis/laCountyParcels';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const apns = Array.isArray(body?.apns) ? body.apns : [];

    if (!Array.isArray(apns)) {
      return NextResponse.json({ error: 'apns must be an array' }, { status: 400 });
    }

    if (apns.length === 0) {
      const empty: FeatureCollection = { type: 'FeatureCollection', features: [] };
      return NextResponse.json(empty);
    }

    const collection = await fetchParcelsByAPN(apns);
    return NextResponse.json(collection);
  } catch (error) {
    console.error('LA parcels proxy failed:', error);
    const empty: FeatureCollection = { type: 'FeatureCollection', features: [] };
    return NextResponse.json(empty, { status: 200 });
  }
}
