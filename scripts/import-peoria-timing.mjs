#!/usr/bin/env node
/**
 * Import Peoria Lakes timing data to Peoria Meadows
 * - Parcel sale periods
 * - Budget item timing by phase
 * - Land use pricing
 */

import { sql } from '@vercel/postgres';
import 'dotenv/config';

async function main() {
  console.log('🔍 Starting Peoria Lakes → Peoria Meadows timing import\n');

  // Step 1: Find Peoria Meadows project ID
  console.log('Step 1: Finding Peoria Meadows project...');
  const projectResult = await sql`
    SELECT project_id, project_name
    FROM landscape.tbl_project
    WHERE project_name ILIKE '%peoria%'
  `;

  const projects = projectResult.rows;
  console.log('Found projects:', projects.map(p => `${p.project_id}: ${p.project_name}`).join(', '));

  const peoriaMeadows = projects.find(p => p.project_name.toLowerCase().includes('meadows'));
  if (!peoriaMeadows) {
    throw new Error('Peoria Meadows project not found');
  }

  const projectId = peoriaMeadows.project_id;
  console.log(`✓ Peoria Meadows project_id = ${projectId}\n`);

  // Step 2: Discover parcel table schema
  console.log('Step 2: Discovering parcel table schema...');
  const parcelSchemaResult = await sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'landscape'
      AND table_name = 'tbl_parcel'
    ORDER BY ordinal_position
  `;

  const parcelColumns = parcelSchemaResult.rows.map(r => r.column_name);
  console.log('Parcel table columns:', parcelColumns.slice(0, 15).join(', '), '...');

  // Check for sale timing field
  const saleFields = parcelColumns.filter(c =>
    c.includes('sale') || c.includes('period') || c.includes('timing')
  );
  console.log('Sale timing fields:', saleFields.join(', ') || 'None found');

  // Check sample parcels
  const sampleParcelsResult = await sql`
    SELECT parcel_id, parcel_name, parcel_code, project_id
    FROM landscape.tbl_parcel
    WHERE project_id = ${projectId}
    ORDER BY parcel_id
    LIMIT 5
  `;
  console.log('Sample parcels:', sampleParcelsResult.rows);

  // Step 3: Check if sale_period column exists
  const hasSalePeriod = parcelColumns.includes('sale_period');
  console.log(`\n✓ sale_period column exists: ${hasSalePeriod}`);

  if (!hasSalePeriod) {
    console.log('⚠️  sale_period column not found. Checking for alternatives...');
    // Could add logic to create column if needed
    throw new Error('sale_period column not found in tbl_parcel');
  }

  // Step 4: Update parcel sale periods
  console.log('\nStep 3: Updating parcel sale periods...');

  const parcelTimingData = [
    ['1.101', 26], ['1.102', 26], ['1.103', 26], ['1.104', 26],
    ['1.201', 42], ['1.202', 42], ['1.203', 42], ['1.204', 42],
    ['1.205', 42], ['1.206', 42],
    ['2.101', 48], ['2.102', 48], ['2.103', 48], ['2.104', 48],
    ['2.105', 48], ['2.106', 48], ['2.107', 48], ['2.108', 48],
    ['2.109', 48], ['2.110', 48], ['2.111', 48],
    ['2.201', 72], ['2.202', 73],
    ['3.101', 48], ['3.102', 48], ['3.103', 48],
    ['3.201', 48], ['3.202', 48],
    ['4.102', 78], ['4.104', 78], ['4.105', 78],
    ['4.201', 96], ['4.202', 96], ['4.203', 96], ['4.204', 96],
    ['4.205', 96], ['4.206', 96]
  ];

  let parcelUpdateCount = 0;
  for (const [parcelName, saleMonth] of parcelTimingData) {
    const result = await sql`
      UPDATE landscape.tbl_parcel
      SET sale_period = ${saleMonth}
      WHERE project_id = ${projectId}
        AND parcel_code = ${parcelName}
    `;

    if (result.rowCount > 0) {
      console.log(`  ✓ ${parcelName} → month ${saleMonth}`);
      parcelUpdateCount++;
    } else {
      console.log(`  ⚠️  ${parcelName} not found`);
    }
  }

  console.log(`\n✓ Updated ${parcelUpdateCount}/${parcelTimingData.length} parcels\n`);

  // Step 5: Update budget timing
  console.log('Step 4: Updating budget item timing...');

  // For now, set all budget items to start at month 1 with 96-month duration
  // This covers the full project timeline from the data (Phase 4.2 ends at month 96)
  const result = await sql`
    UPDATE landscape.core_fin_fact_budget
    SET
      start_period = 1,
      periods_to_complete = 96
    WHERE project_id = ${projectId}
  `;

  console.log(`  ✓ Updated ${result.rowCount} budget items with project-level timing (start=1, duration=96)`);
  console.log(`\n✓ Budget timing updated\n`);

  // Step 6: Populate land use pricing
  console.log('Step 5: Populating land use pricing...');

  const pricingData = [
    ['C', 'Commercial', '$/SF', 10.00],
    ['HDR', 'High Density Residential', '$/Unit', 25000.00],
    ['MDR', 'Medium Density Residential', '$/FF', 2400.00],
    ['MHDR', 'Medium-High Density Residential', '$/Unit', 50000.00],
    ['MLDR', 'Medium-Low Density Residential', '$/FF', 2200.00],
    ['MU', 'Mixed Use', '$/SF', 10.00],
    ['OS', 'Open Space', '$/Acre', 0.00]
  ];

  let pricingInsertCount = 0;
  for (const [luCode, description, uom, price] of pricingData) {
    try {
      // First, check if it exists
      const existing = await sql`
        SELECT id FROM landscape.land_use_pricing
        WHERE project_id = ${projectId} AND lu_type_code = ${luCode}
      `;

      if (existing.rowCount > 0) {
        // Update
        await sql`
          UPDATE landscape.land_use_pricing
          SET price_per_unit = ${price}, unit_of_measure = ${uom}
          WHERE project_id = ${projectId} AND lu_type_code = ${luCode}
        `;
        console.log(`  ✓ ${luCode}: ${uom} ${price} (updated)`);
      } else {
        // Insert
        await sql`
          INSERT INTO landscape.land_use_pricing (
            project_id,
            lu_type_code,
            price_per_unit,
            unit_of_measure
          ) VALUES (
            ${projectId},
            ${luCode},
            ${price},
            ${uom}
          )
        `;
        console.log(`  ✓ ${luCode}: ${uom} ${price} (inserted)`);
      }
      pricingInsertCount++;
    } catch (err) {
      console.log(`  ⚠️  ${luCode}: ${err.message}`);
    }
  }

  console.log(`\n✓ Inserted/updated ${pricingInsertCount} pricing records\n`);

  // Step 7: Verification
  console.log('Step 6: Verification...\n');

  // Verify parcels
  const parcelVerifyResult = await sql`
    SELECT COUNT(*) as total, COUNT(sale_period) as with_timing
    FROM landscape.tbl_parcel
    WHERE project_id = ${projectId}
  `;
  console.log('Parcels:', parcelVerifyResult.rows[0]);

  // Verify budget items
  const budgetVerifyResult = await sql`
    SELECT
      COUNT(*) as total,
      COUNT(start_period) as with_start,
      COUNT(periods_to_complete) as with_duration
    FROM landscape.core_fin_fact_budget
    WHERE project_id = ${projectId}
  `;
  console.log('Budget items:', budgetVerifyResult.rows[0]);

  // Verify pricing
  const pricingVerifyResult = await sql`
    SELECT COUNT(*) as total
    FROM landscape.land_use_pricing
    WHERE project_id = ${projectId}
  `;
  console.log('Pricing records:', pricingVerifyResult.rows[0]);

  console.log('\n' + '='.repeat(60));
  console.log('✅ Import completed successfully!');
  console.log('='.repeat(60));
}

main()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
