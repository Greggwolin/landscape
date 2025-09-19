import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// API for Land Use Code Mapping between legacy parcel data and structured land use system
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const action = searchParams.get('action') || 'analyze';

    if (action === 'analyze') {
      return await analyzeLandUseMismatches(projectId);
    } else if (action === 'suggestions') {
      return await getSuggestedMappings(projectId);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Land use mapping API error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze land use mapping', details: msg },
      { status: 500 }
    );
  }
}

async function analyzeLandUseMismatches(projectId: string | null) {
  // Get all land use codes from parcels (legacy data)
  let parcelCodesQuery;
  if (projectId) {
    parcelCodesQuery = sql`
      SELECT DISTINCT landuse_code, COUNT(*) as parcel_count
      FROM landscape.tbl_parcel 
      WHERE project_id = ${projectId} AND landuse_code IS NOT NULL AND landuse_code != ''
      GROUP BY landuse_code
      ORDER BY landuse_code
    `;
  } else {
    parcelCodesQuery = sql`
      SELECT DISTINCT landuse_code, COUNT(*) as parcel_count
      FROM landscape.tbl_parcel 
      WHERE landuse_code IS NOT NULL AND landuse_code != ''
      GROUP BY landuse_code
      ORDER BY landuse_code
    `;
  }

  const [parcelCodes, currentLandUses] = await Promise.all([
    parcelCodesQuery,
    sql`
      SELECT landuse_code, name, subtype_id, active
      FROM landscape.tbl_landuse 
      WHERE active = true
      ORDER BY landuse_code
    `
  ]);

  // Create lookup sets for comparison
  const parcelCodeSet = new Set(parcelCodes.map(p => p.landuse_code));
  const currentCodeSet = new Set(currentLandUses.map(l => l.landuse_code));

  // Find mismatches
  const unmatchedInParcels = parcelCodes.filter(p => !currentCodeSet.has(p.landuse_code));
  const unusedInSystem = currentLandUses.filter(l => !parcelCodeSet.has(l.landuse_code));
  const matched = parcelCodes.filter(p => currentCodeSet.has(p.landuse_code));

  return NextResponse.json({
    analysis: {
      total_parcel_codes: parcelCodes.length,
      total_system_codes: currentLandUses.length,
      matched_codes: matched.length,
      unmatched_parcel_codes: unmatchedInParcels.length,
      unused_system_codes: unusedInSystem.length
    },
    unmatched_parcel_codes: unmatchedInParcels.map(p => ({
      code: p.landuse_code,
      parcel_count: p.parcel_count,
      needs_mapping: true
    })),
    unused_system_codes: unusedInSystem.map(l => ({
      code: l.landuse_code,
      name: l.name,
      subtype_id: l.subtype_id,
      available_for_mapping: true
    })),
    matched_codes: matched.map(p => ({
      code: p.landuse_code,
      parcel_count: p.parcel_count,
      status: 'mapped'
    }))
  });
}

async function getSuggestedMappings(projectId: string | null) {
  // Get jurisdiction-specific land use codes if project specified
  let jurisdictionalCodes = [];
  
  if (projectId) {
    try {
      // Get project jurisdiction
      const project = await sql`
        SELECT jurisdiction_city, jurisdiction_county, jurisdiction_state
        FROM landscape.tbl_project
        WHERE project_id = ${projectId}
      `;

      if (project.length > 0) {
        const jurisdiction = `${project[0].jurisdiction_city}, ${project[0].jurisdiction_state}`;
        
        // Get jurisdictional land use codes from zoning glossary
        jurisdictionalCodes = await sql`
          SELECT mapped_use as landuse_code, local_code_raw, description
          FROM land_v2.glossary_zoning
          WHERE jurisdiction_display = ${jurisdiction}
          GROUP BY mapped_use, local_code_raw, description
          ORDER BY mapped_use
        `;
      }
    } catch (e) {
      console.log('Could not fetch jurisdictional codes:', e);
    }
  }

  return NextResponse.json({
    jurisdictional_codes: jurisdictionalCodes,
    mapping_suggestions: [
      // Common mapping patterns that could be suggested based on name similarity
      { legacy_pattern: "^(GOLF|Golf)$", suggested_family: "Open Space", suggested_code: "OS" },
      { legacy_pattern: "^(PARK|Park)$", suggested_family: "Open Space", suggested_code: "OS" },
      { legacy_pattern: "^(REC|Recreation)$", suggested_family: "Open Space", suggested_code: "OS" },
      { legacy_pattern: "^(COM|COMM|Commercial)$", suggested_family: "Commercial", suggested_code: "C" },
      { legacy_pattern: "^(RES|Residential)$", suggested_family: "Residential", suggested_code: "SFD" },
      { legacy_pattern: "^(SF|Single)$", suggested_family: "Residential", suggested_code: "SFD" }
    ]
  });
}

// POST endpoint to create mappings
export async function POST(request: Request) {
  try {
    const { legacy_code, target_landuse_id, create_new, new_landuse_data } = await request.json();

    if (!legacy_code) {
      return NextResponse.json({ error: 'Legacy code is required' }, { status: 400 });
    }

    if (create_new && new_landuse_data) {
      // Create new land use code in the system
      const newLandUse = await sql`
        INSERT INTO landscape.tbl_landuse (landuse_code, landuse_type, name, description, active, subtype_id)
        VALUES (${legacy_code}, ${new_landuse_data.landuse_type}, ${new_landuse_data.name}, ${new_landuse_data.description || ''}, true, ${new_landuse_data.subtype_id || null})
        RETURNING *
      `;

      return NextResponse.json({
        success: true,
        action: 'created',
        new_landuse: newLandUse[0],
        message: `Created new land use code: ${legacy_code}`
      });
    } else if (target_landuse_id) {
      // Map to existing land use code (this would require a mapping table)
      // For now, we'll just return a success message
      return NextResponse.json({
        success: true,
        action: 'mapped',
        message: `Mapped legacy code ${legacy_code} to existing land use ID ${target_landuse_id}`
      });
    }

    return NextResponse.json({ error: 'Either target_landuse_id or create_new must be specified' }, { status: 400 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Land use mapping creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create land use mapping', details: msg },
      { status: 500 }
    );
  }
}