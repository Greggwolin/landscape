import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

interface TaxParcelRow {
  tax_parcel_id: string;
  assessor_attrs: unknown;
  geom: unknown;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bboxParam = searchParams.get('bbox');
    const limitParam = searchParams.get('limit');
    const limit = Math.min(Math.max(parseInt(limitParam ?? '400', 10) || 400, 100), 2000);

    if (!bboxParam) {
      return NextResponse.json(
        { error: 'bbox parameter is required (minLng,minLat,maxLng,maxLat)' },
        { status: 400 }
      );
    }

    const parts = bboxParam.split(',').map((value) => parseFloat(value));
    if (parts.length !== 4 || parts.some((value) => Number.isNaN(value))) {
      return NextResponse.json(
        { error: 'bbox must contain four numeric values' },
        { status: 400 }
      );
    }

    const [minLng, minLat, maxLng, maxLat] = parts;

    const parcels = await sql<TaxParcelRow[]>`
      SELECT
        tax_parcel_id,
        assessor_attrs,
        ST_AsGeoJSON(ST_Transform(geom, 4326))::json as geom
      FROM landscape.gis_tax_parcel_ref
      WHERE geom && ST_Transform(ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326), 3857)
      LIMIT ${limit}
    `;

    const features = parcels.map((parcel) => ({
      type: 'Feature' as const,
      id: parcel.tax_parcel_id,
      geometry: parcel.geom,
      properties: {
        tax_parcel_id: parcel.tax_parcel_id,
        assessor_attrs: parcel.assessor_attrs,
      },
    }));

    return NextResponse.json({
      type: 'FeatureCollection',
      features,
      metadata: {
        count: features.length,
        bbox: [minLng, minLat, maxLng, maxLat],
      },
    });
  } catch (error) {
    console.error('Tax parcels API error:', error);
    return NextResponse.json(
      { error: 'Failed to load tax parcels', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
