#!/usr/bin/env node
/**
 * Generate sale events for Peoria Meadows parcels
 * Creates tbl_parcel_sale_event records based on parcel data
 */

import { sql } from '@vercel/postgres';
import 'dotenv/config';

async function main() {
  console.log('🔍 Generating sale events for Peoria Meadows\n');

  const projectId = 9;

  // Get all parcels with units (saleable parcels)
  const parcels = await sql`
    SELECT parcel_id, parcel_code, units_total, phase_id
    FROM landscape.tbl_parcel
    WHERE project_id = ${projectId}
      AND units_total > 0
    ORDER BY parcel_id
  `;

  console.log(`Found ${parcels.rowCount} parcels with units\n`);

  let createdCount = 0;

  for (const parcel of parcels.rows) {
    try {
      // Check if sale event already exists
      const existing = await sql`
        SELECT sale_event_id
        FROM landscape.tbl_parcel_sale_event
        WHERE project_id = ${projectId} AND parcel_id = ${parcel.parcel_id}
      `;

      if (existing.rowCount > 0) {
        console.log(`  ⚠️  ${parcel.parcel_code}: sale event already exists`);
        continue;
      }

      // Create sale event
      await sql`
        INSERT INTO landscape.tbl_parcel_sale_event (
          project_id,
          parcel_id,
          phase_id,
          sale_type,
          total_lots_contracted,
          has_custom_overrides,
          sale_status
        ) VALUES (
          ${projectId},
          ${parcel.parcel_id},
          ${parcel.phase_id},
          'single_closing',
          ${parcel.units_total},
          false,
          'active'
        )
      `;

      console.log(`  ✓ ${parcel.parcel_code}: created sale event for ${parcel.units_total} units`);
      createdCount++;
    } catch (err) {
      console.log(`  ❌ ${parcel.parcel_code}: ${err.message}`);
    }
  }

  console.log(`\n✅ Created ${createdCount} sale events\n`);

  // Verification
  const verification = await sql`
    SELECT COUNT(*) as total
    FROM landscape.tbl_parcel_sale_event
    WHERE project_id = ${projectId}
  `;

  console.log(`Total sale events for project ${projectId}: ${verification.rows[0].total}`);
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
