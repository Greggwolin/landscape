import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { normalizeState, GEO_LEVEL_ORDER } from '@/lib/geo/constants';
import { bootstrapCity } from '@/lib/geo/bootstrap';

type GeoRow = {
  geo_id: string;
  geo_level: string;
  geo_name: string;
  hierarchy: Record<string, unknown> | null;
  usps_city: string | null;
  usps_state: string | null;
};

const ORDER = GEO_LEVEL_ORDER;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const geoId = searchParams.get('geo_id');

    let baseRow: GeoRow | null = null;
    let notice: string | null = null;

    const findCity = async (cityName: string, stateCode: string) => {
      const rows = await sql`
        SELECT geo_id, geo_level, geo_name, hierarchy, usps_city, usps_state
        FROM public.geo_xwalk
        WHERE geo_level = 'CITY'
          AND LOWER(usps_city) = LOWER(${cityName})
          AND UPPER(usps_state) = UPPER(${stateCode})
        LIMIT 1
      `;
      return rows[0] ?? null;
    };

    const findState = async (stateCode: string) => {
      const rows = await sql`
        SELECT geo_id, geo_level, geo_name, hierarchy, usps_city, usps_state
        FROM public.geo_xwalk
        WHERE geo_level = 'STATE'
          AND (
            UPPER(usps_state) = UPPER(${stateCode})
            OR UPPER(geo_name) = UPPER(${stateCode})
          )
        LIMIT 1
      `;
      return rows[0] ?? null;
    };

    if (geoId) {
      const rows = await sql`
        SELECT geo_id, geo_level, geo_name, hierarchy, usps_city, usps_state
        FROM public.geo_xwalk
        WHERE geo_id = ${geoId}
        LIMIT 1
      `;
      baseRow = rows[0] ?? null;
    } else if (city && state) {
      const normalizedState = normalizeState(state);
      baseRow = await findCity(city, normalizedState);

      // Auto-bootstrap: if city not in geo_xwalk, resolve via Census APIs
      if (!baseRow) {
        try {
          console.log(`[geos] City '${city}, ${normalizedState}' not in geo_xwalk — auto-bootstrapping...`);
          const result = await bootstrapCity(city, normalizedState);
          console.log(`[geos] Bootstrap complete: ${result.city_geo_id} (${result.records_upserted} records)`);

          // Re-query after bootstrap
          baseRow = await findCity(city, normalizedState);
          if (baseRow) {
            notice = `Geography auto-resolved for ${city}, ${normalizedState} via Census Bureau APIs.`;
          }
        } catch (bootstrapErr) {
          console.warn(`[geos] Auto-bootstrap failed for '${city}, ${normalizedState}':`, bootstrapErr);
          // Fall through to state-level fallback
        }
      }

      if (!baseRow) {
        baseRow = await findState(normalizedState);
        if (baseRow) {
          const statewideName = baseRow.geo_name ?? state.toUpperCase();
          notice = `City-level geography "${city}, ${state}" not found; showing statewide coverage for ${statewideName}.`;
        }
      }
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

    // Check if hierarchy uses "chain" array format (new format)
    if ('chain' in hierarchy && Array.isArray(hierarchy.chain)) {
      for (const geoId of hierarchy.chain) {
        if (typeof geoId === 'string' && !ids.includes(geoId)) {
          ids.push(geoId);
        }
      }
    } else {
      // Fall back to old dict-based hierarchy format
      // Check both MSA and MICRO keys since a city may have either
      const keysToCheck = ['county', 'msa', 'micro', 'state', 'us'];
      for (const key of keysToCheck) {
        const value = hierarchy[key];
        if (typeof value === 'string') {
          ids.push(value);
        } else if (value && typeof value === 'object' && 'geo_id' in (value as Record<string, unknown>)) {
          ids.push(String((value as Record<string, unknown>).geo_id));
        }
      }
    }

    const uniqueIds = Array.from(new Set(ids));

    const related = await sql`
      SELECT geo_id, geo_level, geo_name, hierarchy, usps_city, usps_state
      FROM public.geo_xwalk
      WHERE geo_id = ANY(${uniqueIds})
    `;

    const byId = new Map<string, GeoRow>();
    for (const row of related) {
      byId.set(row.geo_id, row);
    }

    const dataCounts = await sql`
      SELECT md.geo_id, COUNT(*)::text AS observations
      FROM public.market_data md
      WHERE md.geo_id = ANY(${uniqueIds})
      GROUP BY md.geo_id
    `;

    const countsById = new Map<string, number>();
    for (const row of dataCounts) {
      countsById.set(row.geo_id, Number(row.observations));
    }

    const priority = ORDER.reduce<Record<string, number>>((acc, level, index) => {
      acc[level] = index;
      return acc;
    }, {});

    const sortedCandidates = Array.from(byId.values()).sort((a, b) => {
      const aPriority = priority[a.geo_level] ?? Number.MAX_SAFE_INTEGER;
      const bPriority = priority[b.geo_level] ?? Number.MAX_SAFE_INTEGER;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return (countsById.get(b.geo_id) ?? 0) - (countsById.get(a.geo_id) ?? 0);
    });

    const candidateWithData = sortedCandidates.find((row) => (countsById.get(row.geo_id) ?? 0) > 0);

    if (candidateWithData && candidateWithData.geo_id !== baseRow.geo_id) {
      const levelLabel = candidateWithData.geo_level.toLowerCase();
      const fallbackMessage = `Using ${levelLabel} coverage for ${candidateWithData.geo_name} based on available market data.`;
      notice = notice ? `${notice} ${fallbackMessage}` : fallbackMessage;
      baseRow = candidateWithData;
    }

    if (!candidateWithData) {
      // No market_data rows yet — still return the geo hierarchy so
      // the Location tab can display the geographic scope and trigger
      // analysis generation. The left-panel indicators will show "—".
      notice = notice
        ? `${notice} No market data ingested yet for this geography.`
        : 'No market data ingested yet for this geography. Economic indicators will populate after data ingestion.';
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
      notice: notice ?? undefined,
    });
  } catch (error) {
    console.error('market/geos GET error', error);
    return NextResponse.json(
      { error: 'Failed to resolve geographies' },
      { status: 500 },
    );
  }
}
