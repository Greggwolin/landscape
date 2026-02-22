/**
 * Project Map Data API Endpoint
 *
 * Returns GeoJSON data for project footprint and optional context layers
 */

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { geocodeLocation } from '@/lib/geocoding';

function normalizeCoordinate(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  try {
    // Fetch project coordinates from database
    const projectResult = await pool.query(
      `SELECT project_name,
              location_lon AS lng,
              location_lat AS lat,
              COALESCE(stories, 3) as stories,
              COALESCE(street_address, project_address) as street_address,
              city,
              state,
              zip_code,
              jurisdiction_city,
              jurisdiction_state,
              jurisdiction_county,
              gis_metadata
       FROM landscape.tbl_project
       WHERE project_id = $1`,
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const project = projectResult.rows[0];

    let lng: number | null = normalizeCoordinate(project.lng);
    let lat: number | null = normalizeCoordinate(project.lat);

    const metadata = (project.gis_metadata ?? {}) as Record<string, unknown>;
    const locationOverride = metadata?.location_override === true;

    const fallbackCity = project.city || project.jurisdiction_city;
    const fallbackState = project.state || project.jurisdiction_state;
    const fallbackZip = project.zip_code;
    const fallbackCounty = project.jurisdiction_county;
    const addressParts = [
      project.street_address,
      fallbackCity,
      fallbackState,
      fallbackZip,
      fallbackCounty
    ].filter(Boolean);

    const addressKey = addressParts.join('|');
    const primaryQuery = addressParts.length >= 2 ? addressParts.join(', ') : null;
    const secondaryQuery = fallbackCity && fallbackState ? `${fallbackCity}, ${fallbackState}` : null;

    const cachedGeocode = metadata?.geocode_key === addressKey
      && typeof (metadata as Record<string, unknown>)?.geocode_center === 'object'
      ? (metadata as { geocode_center?: { lat?: number; lng?: number } }).geocode_center
      : null;
    const cachedLat = normalizeCoordinate(cachedGeocode?.lat);
    const cachedLng = normalizeCoordinate(cachedGeocode?.lng);

    const tryGeocode = async (query: string | null) => {
      if (!query) return null;
      try {
        return await geocodeLocation(query);
      } catch (geoError) {
        console.error('Geocoding failed for project map:', geoError);
        return null;
      }
    };

    if (!locationOverride && primaryQuery) {
      if (Number.isFinite(cachedLng) && Number.isFinite(cachedLat)) {
        lng = cachedLng;
        lat = cachedLat;
      } else {
        const geocode =
          (await tryGeocode(primaryQuery)) ||
          (await tryGeocode(secondaryQuery));

        if (geocode) {
          lat = geocode.latitude;
          lng = geocode.longitude;
          const nextMetadata = {
            ...metadata,
            location_override: false,
            geocode_key: addressKey,
            geocode_center: { lat, lng },
            geocode_source: geocode.source || 'geocode',
            geocode_at: new Date().toISOString(),
          };
          await pool.query(
            `UPDATE landscape.tbl_project
             SET location_lat = $1, location_lon = $2, gis_metadata = $3
             WHERE project_id = $4`,
            [lat, lng, JSON.stringify(nextMetadata), projectId]
          );
        }
      }
    }

    if (!locationOverride && (!Number.isFinite(lng) || !Number.isFinite(lat))) {
      if (Number.isFinite(cachedLng) && Number.isFinite(cachedLat)) {
        lng = cachedLng;
        lat = cachedLat;
      }
    }

    // If we still don't have coordinates, return a friendly error
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      return NextResponse.json(
        { error: 'Project coordinates unavailable' },
        { status: 404 }
      );
    }

    // Generate approximate building footprint (small rectangle around center point)
    // In production, this would come from PostGIS parcel boundaries
    const offsetLng = 0.0003; // ~30 meters
    const offsetLat = 0.0002; // ~20 meters

    const center = [Number(lng), Number(lat)] as [number, number];

    const payload = {
      center,
      footprint: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              id: projectId,
              name: project.project_name,
              stories: project.stories,
              defaultStories: 3,
              color: '#2d8cf0'
            },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [center[0] - offsetLng, center[1] - offsetLat],
                  [center[0] - offsetLng, center[1] + offsetLat],
                  [center[0] + offsetLng, center[1] + offsetLat],
                  [center[0] + offsetLng, center[1] - offsetLat],
                  [center[0] - offsetLng, center[1] - offsetLat]
                ]
              ]
            }
          }
        ]
      },
      context: {
        type: 'FeatureCollection',
        features: []
      },
      location_override: locationOverride
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Error fetching project map data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
