import { NextResponse } from 'next/server';
import type { FeatureCollection } from 'geojson';
import { fetchParcelsByAPN, fetchParcelsByBbox } from '@/lib/gis/laCountyParcels';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const apns = Array.isArray(body?.apns) ? body.apns : [];
    const rawBbox = body?.bbox;

    if (!Array.isArray(apns) && rawBbox === undefined) {
      return NextResponse.json({ error: 'apns must be an array or bbox provided' }, { status: 400 });
    }

    if (Array.isArray(rawBbox) && rawBbox.length === 4) {
      const bbox = rawBbox.map((value: unknown) => Number(value)) as [number, number, number, number];
      if (bbox.some((value) => !Number.isFinite(value))) {
        return NextResponse.json({ error: 'bbox must be numeric [west,south,east,north]' }, { status: 400 });
      }
      const collection = await fetchParcelsByBbox(bbox);
      return NextResponse.json(collection);
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
