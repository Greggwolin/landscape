// app/api/market-pricing/route.ts
// API endpoint for managing land use pricing in market assumptions

import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      return NextResponse.json({
        error: 'project_id parameter required'
      }, { status: 400 });
    }

    // Fetch pricing data from dedicated land_use_pricing table
    try {
      const pricingData = await sql`
        SELECT
          lup.id,
          lup.lu_type_code,
          lup.product_code,
          lup.price_per_unit,
          lup.unit_of_measure,
          lup.inflation_type,
          lup.growth_rate,
          lst.name as type_name
        FROM landscape.land_use_pricing lup
        LEFT JOIN landscape.lu_subtype lst ON lst.code = lup.lu_type_code
        WHERE lup.project_id = ${projectId}
        ORDER BY lup.lu_type_code, lup.product_code
      `;

      return NextResponse.json(pricingData || []);
    } catch (dbError) {
      console.warn('Failed to fetch pricing data from database:', dbError);
      return NextResponse.json([]);
    }

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Market pricing API error:', error);
    return NextResponse.json({
      error: 'Failed to fetch market pricing data',
      details: message
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { project_id, pricing_data } = body;

    if (!project_id || !pricing_data || !Array.isArray(pricing_data)) {
      return NextResponse.json({
        error: 'project_id and pricing_data array required'
      }, { status: 400 });
    }

    // Delete existing pricing data for this project
    await sql`
      DELETE FROM landscape.land_use_pricing
      WHERE project_id = ${project_id}
    `;

    // Insert new pricing data
    for (const item of pricing_data) {
      if (item.lu_type_code && item.price_per_unit !== null && item.price_per_unit !== undefined) {
        await sql`
          INSERT INTO landscape.land_use_pricing (
            project_id,
            lu_type_code,
            product_code,
            price_per_unit,
            unit_of_measure,
            inflation_type,
            growth_rate
          ) VALUES (
            ${project_id},
            ${item.lu_type_code},
            ${item.product_code || null},
            ${item.price_per_unit},
            ${item.unit_of_measure || 'LS'},
            ${item.inflation_type || 'Global'},
            ${item.growth_rate || null}
          )
        `;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Market pricing save error:', error);
    return NextResponse.json({
      error: 'Failed to save market pricing data',
      details: message
    }, { status: 500 });
  }
}