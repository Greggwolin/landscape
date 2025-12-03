import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

interface SeriesPoint {
  date: string;
  value: string | null;
  coverage_note: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const geoId = searchParams.get('geo_id');
    const seasonal = searchParams.get('seasonal');
    const codesParam = searchParams.get('codes');
    const geoIdsParam = searchParams.get('geo_ids');

    if (!geoId && !geoIdsParam) {
      return NextResponse.json({ error: 'geo_id or geo_ids parameter required' }, { status: 400 });
    }

    const geoIds = geoIdsParam
      ? geoIdsParam.split(',').map((id) => id.trim()).filter(Boolean)
      : [geoId as string];

    const codes = codesParam
      ? codesParam.split(',').map((code) => code.trim()).filter(Boolean)
      : null;
    const normalizedCodes = codes ? codes.map((c) => c.toUpperCase()) : null;

    const result = await sql<{
      series_code: string;
      series_name: string;
      category: string;
      subcategory: string | null;
      geo_id: string;
      geo_level: string;
      geo_name: string;
      units: string | null;
      seasonal: string | null;
      date: string;
      value: string | null;
      coverage_note: string | null;
    }>`
      SELECT
        ms.series_code,
        ms.series_name,
        ms.category,
        ms.subcategory,
        md.geo_id,
        gx.geo_level,
        gx.geo_name,
        ms.units,
        ms.seasonal,
        md.date::text,
        md.value::text,
        md.coverage_note
      FROM public.market_data md
      JOIN public.market_series ms ON ms.series_id = md.series_id
      JOIN public.geo_xwalk gx ON gx.geo_id = md.geo_id
      WHERE gx.geo_id = ANY(${geoIds})
      ORDER BY ms.series_code, gx.geo_id, md.date
    `;

    const grouped = new Map<string, {
      series_code: string;
      series_name: string;
      category: string;
      subcategory: string | null;
      geo_id: string;
      geo_level: string;
      geo_name: string;
      units: string | null;
      seasonal: string | null;
      data: SeriesPoint[];
    }>();

    const categories = category ? category.split(',').map(c => c.trim()) : null;

    for (const row of result) {
      if (categories && !categories.includes(row.category)) continue;
      if (seasonal && row.seasonal && row.seasonal !== seasonal) continue;
      if (normalizedCodes && !normalizedCodes.includes(row.series_code.toUpperCase())) continue;
      const key = `${row.series_code}__${row.geo_id}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          series_code: row.series_code,
          series_name: row.series_name,
          category: row.category,
          subcategory: row.subcategory,
          geo_id: row.geo_id,
          geo_level: row.geo_level,
          geo_name: row.geo_name,
          units: row.units,
          seasonal: row.seasonal,
          data: [],
        });
      }
      grouped.get(key)!.data.push({
        date: row.date,
        value: row.value,
        coverage_note: row.coverage_note,
      });
    }

    return NextResponse.json({
      series: Array.from(grouped.values()),
    });
  } catch (error) {
    console.error('market/series GET error', error);
    return NextResponse.json(
      { error: 'Failed to fetch market series' },
      { status: 500 },
    );
  }
}
