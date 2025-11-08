#!/usr/bin/env tsx

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(process.cwd(), '.env.local') });

async function verifyUnitCosts() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not found in environment');
  }

  const sql = neon(process.env.DATABASE_URL);

  // Check the problem items that were previously transposed
  const problemItems = await sql`
    SELECT
      item_name,
      quantity,
      typical_mid_value as price,
      default_uom_code as uom
    FROM landscape.core_unit_cost_template
    WHERE item_name LIKE '%Manhole%'
       OR item_name LIKE '%Fire Hydrant%'
       OR item_name LIKE '%16" x 6" T%'
    ORDER BY item_name
  `;

  console.log('\n✅ Verification of Previously Transposed Items:\n');
  console.log('Expected from Excel:');
  console.log('  5\' Manhole: Qty=4, Price=9620');
  console.log('  Fire Hydrant: Qty=1, Price=6500');
  console.log('  16" x 6" T: Qty=1, Price=25000\n');

  console.log('Current Database Values:');
  problemItems.forEach(item => {
    console.log(`  ${item.item_name}: Qty=${item.quantity}, Price=${item.price}, UOM=${item.uom}`);
  });

  // Check a few more items for verification
  const sampleItems = await sql`
    SELECT
      item_name,
      quantity,
      typical_mid_value as price,
      default_uom_code as uom
    FROM landscape.core_unit_cost_template
    WHERE item_name IN (
      'Monthly Rental of Fence (per LF per mo)',
      'Over excavation',
      'Grade out Temp Basin'
    )
    ORDER BY item_name
  `;

  console.log('\n✅ Sample of Other Items:');
  console.log('Expected from Excel:');
  console.log('  Fence Rental: Qty=6, Price=330');
  console.log('  Over excavation: Qty=3.47, Price=3792');
  console.log('  Grade Basin: Qty=5.75, Price=3500\n');

  console.log('Current Database Values:');
  sampleItems.forEach(item => {
    console.log(`  ${item.item_name}: Qty=${item.quantity}, Price=${item.price}, UOM=${item.uom}`);
  });

  // Get total count
  const [{ count }] = await sql`
    SELECT COUNT(*) as count
    FROM landscape.core_unit_cost_template
  `;

  console.log(`\n📊 Total unit cost templates in database: ${count}`);
}

verifyUnitCosts().catch((error) => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});
