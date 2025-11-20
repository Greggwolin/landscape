// app/api/admin/create-pricing-table/route.ts
// Create dedicated table for land use pricing data

import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

export async function POST() {
  try {
    console.log('Creating land use pricing table...');

    // Create dedicated pricing table
    await sql`
      CREATE TABLE IF NOT EXISTS landscape.land_use_pricing (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL,
        lu_type_code VARCHAR(50) NOT NULL,
        price_per_unit DECIMAL(15,2),
        unit_of_measure VARCHAR(20),
        inflation_type VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(project_id, lu_type_code)
      )
    `;

    console.log('Land use pricing table created successfully.');

    // Add index for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_land_use_pricing_project
      ON landscape.land_use_pricing(project_id)
    `;

    console.log('Index created successfully.');

    return NextResponse.json({
      success: true,
      message: 'Land use pricing table created successfully'
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Create pricing table failed:', error);
    return NextResponse.json({
      error: 'Create pricing table failed',
      details: message
    }, { status: 500 });
  }
}