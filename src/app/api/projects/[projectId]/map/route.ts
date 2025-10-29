/**
 * Project Map Data API Endpoint
 *
 * Returns GeoJSON data for project footprint and optional context layers
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
    // Fetch project coordinates from database
    const projectResult = await pool.query(
      `SELECT project_name, location_lon as lng, location_lat as lat,
              COALESCE(stories, 3) as stories
       FROM landscape.tbl_project
       WHERE project_id = $1`,
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const project = projectResult.rows[0];

    // Generate approximate building footprint (small rectangle around center point)
    // In production, this would come from PostGIS parcel boundaries
    const offsetLng = 0.0003; // ~30 meters
    const offsetLat = 0.0002; // ~20 meters

    const payload = {
      center: [Number(project.lng), Number(project.lat)] as [number, number],
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
                  [project.lng - offsetLng, project.lat - offsetLat],
                  [project.lng - offsetLng, project.lat + offsetLat],
                  [project.lng + offsetLng, project.lat + offsetLat],
                  [project.lng + offsetLng, project.lat - offsetLat],
                  [project.lng - offsetLng, project.lat - offsetLat]
                ]
              ]
            }
          }
        ]
      },
      context: {
        type: 'FeatureCollection',
        features: []
      }
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Error fetching project map data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
