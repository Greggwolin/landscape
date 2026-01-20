import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * GET /api/ingestion/[projectId]
 *
 * Fetches all data needed for the document ingestion UI:
 * - Project details
 * - Units with lease data
 * - Unit types/mix
 * - Documents
 * - Summary statistics
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const id = parseInt(projectId, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    // Fetch project details
    const projectResult = await sql`
      SELECT
        project_id,
        project_name,
        jurisdiction_city,
        jurisdiction_state
      FROM tbl_project
      WHERE project_id = ${id}
    `;

    if (projectResult.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const project = projectResult[0];

    // Fetch unit summary statistics from tbl_multifamily_unit
    const unitSummary = await sql`
      SELECT
        COUNT(*) as total_units,
        COUNT(CASE WHEN occupancy_status = 'Occupied' THEN 1 END) as occupied_units,
        COUNT(CASE WHEN occupancy_status != 'Occupied' OR occupancy_status IS NULL THEN 1 END) as vacant_units,
        ROUND(AVG(current_rent)::numeric, 2) as avg_rent,
        ROUND(AVG(market_rent)::numeric, 2) as avg_market_rent,
        SUM(current_rent) as total_monthly_rent
      FROM tbl_multifamily_unit
      WHERE project_id = ${id}
    `;

    // Fetch unit types (unit mix) from tbl_multifamily_unit_type
    const unitTypes = await sql`
      SELECT
        unit_type_id,
        unit_type_name,
        unit_type_code,
        avg_square_feet as sqft,
        COALESCE(market_rent, current_market_rent, 0) as market_rent_monthly,
        COALESCE(unit_count, total_units, 0) as unit_count
      FROM tbl_multifamily_unit_type
      WHERE project_id = ${id}
      ORDER BY unit_type_code, unit_type_name
    `;

    // Fetch documents from core_doc
    const documents = await sql`
      SELECT
        doc_id,
        doc_name,
        doc_type,
        storage_uri,
        created_at
      FROM core_doc
      WHERE project_id = ${id}
      ORDER BY created_at DESC
    `;

    // Calculate occupancy percentage
    const summary = unitSummary[0] || {};
    const totalUnits = parseInt(summary.total_units) || 0;
    const occupiedUnits = parseInt(summary.occupied_units) || 0;
    const occupancy = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

    // Transform unit types for unit mix visualization
    const unitMix = unitTypes.map((ut, idx) => {
      const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];
      const count = parseInt(ut.unit_count) || 0;
      const typeName = ut.unit_type_name || ut.unit_type_code || 'Unit';

      // Extract bedroom count from type name if possible (e.g., "1BR", "2 Bed", etc.)
      const bedroomMatch = typeName.match(/(\d+)\s*(BR|Bed|bd)/i);
      let typeLabel = typeName;
      if (bedroomMatch) {
        typeLabel = `${bedroomMatch[1]}BR`;
      } else if (typeName.toLowerCase().includes('studio')) {
        typeLabel = 'Studio';
      } else if (typeName.toLowerCase().includes('commercial')) {
        typeLabel = 'Commercial';
      }

      return {
        id: ut.unit_type_id,
        type: typeLabel,
        name: typeName,
        count,
        avgRent: parseFloat(ut.market_rent_monthly) || 0,
        marketRent: parseFloat(ut.market_rent_monthly) || 0,
        sqft: ut.sqft,
        color: colors[idx % colors.length],
        percentage: totalUnits > 0 ? (count / totalUnits) * 100 : 0,
      };
    });

    // Transform documents for ingestion UI
    const ingestionDocuments = documents.map(doc => ({
      doc_id: doc.doc_id,
      doc_name: doc.doc_name,
      doc_type: doc.doc_type || 'misc',
      status: 'confirmed' as const, // Existing docs are already confirmed
      created_at: doc.created_at,
      storage_uri: doc.storage_uri,
    }));

    // Determine milestone status based on available data
    const hasRentRoll = totalUnits > 0;
    const hasT12 = documents.some(d =>
      d.doc_type === 't12' ||
      d.doc_name?.toLowerCase().includes('t12') ||
      d.doc_name?.toLowerCase().includes('t-12') ||
      d.doc_name?.toLowerCase().includes('income')
    );
    const hasOM = documents.some(d =>
      d.doc_type === 'om' ||
      d.doc_name?.toLowerCase().includes('om') ||
      d.doc_name?.toLowerCase().includes('offering') ||
      d.doc_name?.toLowerCase().includes('memo')
    );

    return NextResponse.json({
      project: {
        id: project.project_id,
        name: project.project_name,
        propertyType: 'MF', // Multifamily - Chadron is a multifamily property
        address: null,
        city: project.jurisdiction_city,
        state: project.jurisdiction_state,
        zipCode: null,
      },
      summary: {
        totalUnits,
        occupiedUnits,
        vacantUnits: parseInt(summary.vacant_units) || 0,
        occupancy,
        avgRent: parseFloat(summary.avg_rent) || 0,
        avgMarketRent: parseFloat(summary.avg_market_rent) || 0,
        totalMonthlyRent: parseFloat(summary.total_monthly_rent) || 0,
        // Placeholder values - would come from T12/financials
        noi: null,
        capRate: null,
        pricePerUnit: null,
      },
      unitMix,
      documents: ingestionDocuments,
      milestones: {
        hasRentRoll,
        hasT12,
        hasOM,
        hasMarketData: false, // Would check market data tables
      },
    });
  } catch (error) {
    console.error('Error fetching ingestion data:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch ingestion data', details: message },
      { status: 500 }
    );
  }
}
