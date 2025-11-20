// /app/api/gis/plan-parcels/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const includeGeometry = searchParams.get('include_geometry') !== 'false';
    const confidenceThreshold = searchParams.get('min_confidence');
    const format = searchParams.get('format') || 'json'; // json or geojson

    if (!projectId) {
      return NextResponse.json({
        error: 'Missing project_id parameter'
      }, { status: 400 });
    }

    const parsedProjectId = parseInt(projectId);

    // Build the query with optional geometry
    const includeGeomStr = includeGeometry ? (
      format === 'geojson'
        ? ', ST_AsGeoJSON(geom)::json as geom'
        : ', ST_AsGeoJSON(geom) as geom_json'
    ) : '';

    const confidenceThresholdNum = confidenceThreshold ? parseFloat(confidenceThreshold) : null;

    // Build the query conditionally
    let parcels;

    if (confidenceThresholdNum) {
      if (includeGeometry) {
        if (format === 'geojson') {
          parcels = await sql`
            SELECT
              gmp.project_id, gmp.parcel_id, gmp.parcel_code, gmp.landuse_code, gmp.landuse_type,
              gmp.acres_gross, gmp.units_total, gmp.area_no, gmp.phase_no, gmp.parcel_no,
              gmp.source_doc, gmp.confidence, gmp.version, ST_AsGeoJSON(geom)::json as geom
            FROM landscape.vw_map_plan_parcels gmp
            WHERE gmp.project_id = ${parsedProjectId} AND gmp.confidence >= ${confidenceThresholdNum}
            ORDER BY COALESCE(gmp.area_no, 0), COALESCE(gmp.phase_no, 0), COALESCE(gmp.parcel_no, 0), gmp.parcel_code
          `;
        } else {
          parcels = await sql`
            SELECT
              gmp.project_id, gmp.parcel_id, gmp.parcel_code, gmp.landuse_code, gmp.landuse_type,
              gmp.acres_gross, gmp.units_total, gmp.area_no, gmp.phase_no, gmp.parcel_no,
              gmp.source_doc, gmp.confidence, gmp.version, ST_AsGeoJSON(geom) as geom_json
            FROM landscape.vw_map_plan_parcels gmp
            WHERE gmp.project_id = ${parsedProjectId} AND gmp.confidence >= ${confidenceThresholdNum}
            ORDER BY COALESCE(gmp.area_no, 0), COALESCE(gmp.phase_no, 0), COALESCE(gmp.parcel_no, 0), gmp.parcel_code
          `;
        }
      } else {
        parcels = await sql`
          SELECT
            gmp.project_id, gmp.parcel_id, gmp.parcel_code, gmp.landuse_code, gmp.landuse_type,
            gmp.acres_gross, gmp.units_total, gmp.area_no, gmp.phase_no, gmp.parcel_no,
            gmp.source_doc, gmp.confidence, gmp.version
          FROM landscape.vw_map_plan_parcels gmp
          WHERE gmp.project_id = ${parsedProjectId} AND gmp.confidence >= ${confidenceThresholdNum}
          ORDER BY COALESCE(gmp.area_no, 0), COALESCE(gmp.phase_no, 0), COALESCE(gmp.parcel_no, 0), gmp.parcel_code
        `;
      }
    } else {
      if (includeGeometry) {
        if (format === 'geojson') {
          parcels = await sql`
            SELECT
              gmp.project_id, gmp.parcel_id, gmp.parcel_code, gmp.landuse_code, gmp.landuse_type,
              gmp.acres_gross, gmp.units_total, gmp.area_no, gmp.phase_no, gmp.parcel_no,
              gmp.source_doc, gmp.confidence, gmp.version, ST_AsGeoJSON(geom)::json as geom
            FROM landscape.vw_map_plan_parcels gmp
            WHERE gmp.project_id = ${parsedProjectId}
            ORDER BY COALESCE(gmp.area_no, 0), COALESCE(gmp.phase_no, 0), COALESCE(gmp.parcel_no, 0), gmp.parcel_code
          `;
        } else {
          parcels = await sql`
            SELECT
              gmp.project_id, gmp.parcel_id, gmp.parcel_code, gmp.landuse_code, gmp.landuse_type,
              gmp.acres_gross, gmp.units_total, gmp.area_no, gmp.phase_no, gmp.parcel_no,
              gmp.source_doc, gmp.confidence, gmp.version, ST_AsGeoJSON(geom) as geom_json
            FROM landscape.vw_map_plan_parcels gmp
            WHERE gmp.project_id = ${parsedProjectId}
            ORDER BY COALESCE(gmp.area_no, 0), COALESCE(gmp.phase_no, 0), COALESCE(gmp.parcel_no, 0), gmp.parcel_code
          `;
        }
      } else {
        parcels = await sql`
          SELECT
            gmp.project_id, gmp.parcel_id, gmp.parcel_code, gmp.landuse_code, gmp.landuse_type,
            gmp.acres_gross, gmp.units_total, gmp.area_no, gmp.phase_no, gmp.parcel_no,
            gmp.source_doc, gmp.confidence, gmp.version
          FROM landscape.vw_map_plan_parcels gmp
          WHERE gmp.project_id = ${parsedProjectId}
          ORDER BY COALESCE(gmp.area_no, 0), COALESCE(gmp.phase_no, 0), COALESCE(gmp.parcel_no, 0), gmp.parcel_code
        `;
      }
    }

    if (format === 'geojson' && includeGeometry) {
      // Return as GeoJSON FeatureCollection
      const features = parcels.map((parcel: Record<string, unknown>) => ({
        type: 'Feature',
        id: parcel.parcel_id,
        geometry: parcel.geom || null,
        properties: {
          project_id: parcel.project_id,
          parcel_id: parcel.parcel_id,
          parcel_code: parcel.parcel_code,
          landuse_code: parcel.landuse_code,
          landuse_type: parcel.landuse_type,
          acres_gross: parcel.acres_gross,
          units_total: parcel.units_total,
          area_no: parcel.area_no,
          phase_no: parcel.phase_no,
          parcel_no: parcel.parcel_no,
          source_doc: parcel.source_doc,
          confidence: parcel.confidence,
          version: parcel.version
        }
      }));

      return NextResponse.json({
        type: 'FeatureCollection',
        features,
        metadata: {
          project_id: parsedProjectId,
          total_features: features.length,
          includes_geometry: true
        }
      });
    }

    // Process geometry for regular JSON format
    const processedParcels = parcels.map((parcel: Record<string, unknown>) => {
      if (includeGeometry && parcel.geom_json) {
        return {
          ...parcel,
          geom: JSON.parse(parcel.geom_json),
          geom_json: undefined
        };
      }
      return parcel;
    });

    // Group by hierarchy for easier navigation
    const grouped = processedParcels.reduce((acc: Record<string, unknown>, parcel: Record<string, unknown>) => {
      const areaKey = parcel.area_no || 'no_area';
      const phaseKey = parcel.phase_no || 'no_phase';

      if (!acc[areaKey]) {
        acc[areaKey] = {
          area_no: parcel.area_no,
          phases: {}
        };
      }

      if (!acc[areaKey].phases[phaseKey]) {
        acc[areaKey].phases[phaseKey] = {
          phase_no: parcel.phase_no,
          parcels: []
        };
      }

      acc[areaKey].phases[phaseKey].parcels.push(parcel);
      return acc;
    }, {});

    // Calculate confidence statistics
    const confidenceStats = {
      high: processedParcels.filter((p: Record<string, unknown>) => (p.confidence as number) >= 0.9).length,
      medium: processedParcels.filter((p: Record<string, unknown>) => (p.confidence as number) >= 0.7 && (p.confidence as number) < 0.9).length,
      low: processedParcels.filter((p: Record<string, unknown>) => (p.confidence as number) < 0.7).length,
      average: processedParcels.reduce((sum: number, p: Record<string, unknown>) => sum + (p.confidence as number), 0) / processedParcels.length || 0
    };

    return NextResponse.json({
      project_id: parsedProjectId,
      parcels: processedParcels,
      grouped_hierarchy: grouped,
      statistics: {
        total_parcels: processedParcels.length,
        confidence_stats: confidenceStats,
        includes_geometry: includeGeometry,
        min_confidence_filter: confidenceThreshold ? parseFloat(confidenceThreshold) : null
      }
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Plan parcels API error:', error);

    return NextResponse.json({
      error: 'Failed to fetch plan parcels',
      details: message
    }, { status: 500 });
  }
}

// POST endpoint for updating parcel confidence or metadata
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { parcel_id, confidence, notes } = body;

    if (!parcel_id) {
      return NextResponse.json({
        error: 'Missing parcel_id'
      }, { status: 400 });
    }

    if (confidence === undefined && notes === undefined) {
      return NextResponse.json({
        error: 'No fields to update'
      }, { status: 400 });
    }

    // Build update query manually since sql.unsafe isn't available
    let result;
    if (confidence !== undefined && notes !== undefined) {
      result = await sql`
        UPDATE landscape.gis_plan_parcel
        SET confidence = ${confidence}, ai_analysis = COALESCE(ai_analysis, '{}') || ${JSON.stringify({ user_notes: notes, updated_at: new Date().toISOString() })}::jsonb
        WHERE parcel_id = ${parcel_id}
        RETURNING parcel_id, confidence
      `;
    } else if (confidence !== undefined) {
      result = await sql`
        UPDATE landscape.gis_plan_parcel
        SET confidence = ${confidence}
        WHERE parcel_id = ${parcel_id}
        RETURNING parcel_id, confidence
      `;
    } else if (notes !== undefined) {
      result = await sql`
        UPDATE landscape.gis_plan_parcel
        SET ai_analysis = COALESCE(ai_analysis, '{}') || ${JSON.stringify({ user_notes: notes, updated_at: new Date().toISOString() })}::jsonb
        WHERE parcel_id = ${parcel_id}
        RETURNING parcel_id, confidence
      `;
    }

    if (result.length === 0) {
      return NextResponse.json({
        error: 'Parcel not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      parcel_id: result[0].parcel_id,
      updated_confidence: result[0].confidence
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Plan parcel update error:', error);

    return NextResponse.json({
      error: 'Failed to update parcel',
      details: message
    }, { status: 500 });
  }
}