import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { generateOpExDefaults } from '@/lib/opex/defaults';

type Params = { params: Promise<{ projectId: string }> };

// POST /api/projects/{projectId}/opex/generate-defaults
export async function POST(
  request: NextRequest,
  context: Params
) {
  try {
    const { projectId } = await context.params;
    const projectIdNum = parseInt(projectId);

    // Get property metrics
    const projectData = await sql`
      SELECT
        p.project_id,
        p.project_name,
        p.jurisdiction_city,
        p.jurisdiction_state
      FROM landscape.tbl_project p
      WHERE p.project_id = ${projectIdNum}
      LIMIT 1
    `;

    if (!projectData || projectData.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const project = projectData[0];

    // Get unit data separately (may not exist for all projects)
    const unitData = await sql`
      SELECT COUNT(*) as unit_count, SUM(square_feet) as rentable_sf
      FROM landscape.tbl_multifamily_unit
      WHERE project_id = ${projectIdNum}
    `;

    // Get acquisition data separately
    const acquisitionData = await sql`
      SELECT purchase_price
      FROM landscape.tbl_property_acquisition
      WHERE project_id = ${projectIdNum}
      LIMIT 1
    `;

    const unitCount = unitData[0]?.unit_count ? parseInt(unitData[0].unit_count) : 0;
    const rentableSF = unitData[0]?.rentable_sf ? parseFloat(unitData[0].rentable_sf) : 0;
    const purchasePrice = acquisitionData[0]?.purchase_price ? parseFloat(acquisitionData[0].purchase_price) : undefined;

    const defaults = generateOpExDefaults({
      units: unitCount,
      rentableSF: rentableSF,
      purchasePrice: purchasePrice,
      effectiveGrossIncome: undefined,
      city: project.jurisdiction_city || undefined,
      state: project.jurisdiction_state || undefined,
      hasPool: false, // TODO: get from property amenities table
      hasElevator: false // TODO: get from property amenities table
    });

    return NextResponse.json({ defaults });

  } catch (error) {
    console.error('Error generating defaults:', error);
    return NextResponse.json(
      { error: 'Failed to generate defaults' },
      { status: 500 }
    );
  }
}
