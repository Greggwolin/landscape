/**
 * Valuation Comparables Map Data API Endpoint
 *
 * Returns GeoJSON data for subject property and comparable sales
 */

import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  try {
    // Fetch subject property
    const projectResult = await pool.query(
      `SELECT project_name, location_lon as lng, location_lat as lat,
              COALESCE(stories, 3) as stories, project_type_code
       FROM landscape.tbl_project
       WHERE project_id = $1`,
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const subject = projectResult.rows[0];

    // Determine project type so we can exclude land comps for
    // improved-property valuations (mirrors Django summary logic)
    const projectType = (subject.project_type_code || '').toUpperCase();

    // Fetch comparables with their actual coordinates.
    // For non-land projects, exclude explicitly-tagged land comps.
    const compsResult = await pool.query(
      `SELECT comparable_id, property_name, address, city, state,
              sale_price, sale_date, units, building_sf, price_per_unit,
              latitude, longitude
       FROM landscape.tbl_sales_comparables
       WHERE project_id = $1
         ${projectType !== 'LAND' ? "AND (property_type IS NULL OR property_type NOT IN ('LAND','land','Land'))" : ''}
       ORDER BY comp_number NULLS LAST, comparable_id`,
      [projectId]
    );

    // Use actual coordinates from database
    const compsFeatures = compsResult.rows.map((comp, index) => {
      // Use actual lat/lon from database, fallback to subject location if missing
      const compLng = comp.longitude ? Number(comp.longitude) : Number(subject.lng);
      const compLat = comp.latitude ? Number(comp.latitude) : Number(subject.lat);

      const offsetLng = 0.0002;
      const offsetLat = 0.0001;

      const pricePerUnit = comp.price_per_unit
        ? Number(comp.price_per_unit)
        : (comp.sale_price && comp.units ? Number(comp.sale_price) / Number(comp.units) : null);

      return {
        type: 'Feature',
        id: `comp-${comp.comparable_id}`,
        properties: {
          id: `comp-${comp.comparable_id}`,
          compId: String(comp.comparable_id),
          name: `${comp.property_name || comp.address}`,
          type: 'sale',
          price: comp.sale_price ? Number(comp.sale_price) : null,
          price_per_unit: pricePerUnit,
          date: comp.sale_date,
          stories: Math.ceil(Number(comp.building_sf || 0) / Number(comp.units || 1) / 1000) || 3,
          defaultStories: 3,
          selected: index === 0, // First comp selected by default
          color: index === 0 ? '#10b981' : '#f59e0b'
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [compLng - offsetLng, compLat - offsetLat],
              [compLng - offsetLng, compLat + offsetLat],
              [compLng + offsetLng, compLat + offsetLat],
              [compLng + offsetLng, compLat - offsetLat],
              [compLng - offsetLng, compLat - offsetLat]
            ]
          ]
        }
      };
    });

    const offsetLng = 0.0003;
    const offsetLat = 0.0002;

    const payload = {
      center: [Number(subject.lng), Number(subject.lat)] as [number, number],
    subject: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'subject',
          properties: {
            id: 'subject',
            name: subject.project_name,
            stories: subject.stories,
            defaultStories: 3,
            color: '#2d8cf0'
          },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [subject.lng - offsetLng, subject.lat - offsetLat],
                [subject.lng - offsetLng, subject.lat + offsetLat],
                [subject.lng + offsetLng, subject.lat + offsetLat],
                [subject.lng + offsetLng, subject.lat - offsetLat],
                [subject.lng - offsetLng, subject.lat - offsetLat]
              ]
            ]
          }
        }
      ]
    },
    comps: {
      type: 'FeatureCollection',
      features: compsFeatures
    }
  };

  return NextResponse.json(payload);
  } catch (error) {
    console.error('Error fetching comps map data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
