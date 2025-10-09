import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type GeoRow = {
  geo_id: string;
  geo_level: string;
  geo_name: string;
  hierarchy: Record<string, unknown> | null;
  usps_city: string | null;
  usps_state: string | null;
};

const ORDER = ['CITY', 'COUNTY', 'MSA', 'STATE', 'US'] as const;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const geoId = searchParams.get('geo_id');

    let baseRow: GeoRow | null = null;

    if (geoId) {
      const rows = await sql<GeoRow>`
        SELECT geo_id, geo_level, geo_name, hierarchy, usps_city, usps_state
        FROM public.geo_xwalk
        WHERE geo_id = ${geoId}
        LIMIT 1
      `;
      baseRow = rows[0] ?? null;
    } else if (city && state) {
      const rows = await sql<GeoRow>`
        SELECT geo_id, geo_level, geo_name, hierarchy, usps_city, usps_state
        FROM public.geo_xwalk
        WHERE geo_level = 'CITY'
          AND LOWER(usps_city) = LOWER(${city})
          AND UPPER(usps_state) = UPPER(${state})
        LIMIT 1
      `;
      baseRow = rows[0] ?? null;
    } else {
      return NextResponse.json(
        { error: 'city/state or geo_id parameter required' },
        { status: 400 },
      );
    }

    if (!baseRow) {
      return NextResponse.json({ error: 'Geography not found' }, { status: 404 });
    }

    const hierarchy = (baseRow.hierarchy ?? {}) as Record<string, unknown>;
    const ids = [baseRow.geo_id];

    for (const key of ORDER.slice(1)) {
      const value = hierarchy[key.toLowerCase()];
      if (typeof value === 'string') {
        ids.push(value);
      } else if (value && typeof value === 'object' && 'geo_id' in (value as Record<string, unknown>)) {
        ids.push(String((value as Record<string, unknown>).geo_id));
      }
    }

    const related = await sql<GeoRow>`
      SELECT geo_id, geo_level, geo_name, hierarchy, usps_city, usps_state
      FROM public.geo_xwalk
      WHERE geo_id = ANY(${ids})
    `;

    const byId = new Map<string, GeoRow>();
    for (const row of related) {
      byId.set(row.geo_id, row);
    }

    const targets = ORDER.map((level) => {
      const match =
        level === baseRow.geo_level
          ? baseRow
          : Array.from(byId.values()).find((row) => row.geo_level === level);
      if (!match) return null;
      return {
        geo_id: match.geo_id,
        geo_level: match.geo_level,
        geo_name: match.geo_name,
      };
    }).filter((item): item is { geo_id: string; geo_level: string; geo_name: string } => Boolean(item));

    return NextResponse.json({
      base: {
        geo_id: baseRow.geo_id,
        geo_level: baseRow.geo_level,
        geo_name: baseRow.geo_name,
        usps_city: baseRow.usps_city,
        usps_state: baseRow.usps_state,
      },
      targets,
    });
  } catch (error) {
    console.error('market/geos GET error', error);
    return NextResponse.json(
      { error: 'Failed to resolve geographies' },
      { status: 500 },
    );
  }
}
