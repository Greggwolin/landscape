#!/usr/bin/env node

import { sql } from '../src/lib/db.ts';

async function migratePricingColumns() {
  try {
    console.log('Adding pricing columns to market_assumptions table...');

    // Add the new columns if they don't exist
    await sql`
      ALTER TABLE landscape.market_assumptions
      ADD COLUMN IF NOT EXISTS lu_type_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS price_per_unit DECIMAL(15,2),
      ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(20),
      ADD COLUMN IF NOT EXISTS inflation_type VARCHAR(50)
    `;

    console.log('Columns added successfully.');

    // Add index for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_market_assumptions_project_lutype
      ON landscape.market_assumptions(project_id, lu_type_code)
    `;

    console.log('Index created successfully.');

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migratePricingColumns();