#!/usr/bin/env node
/**
 * Populate land use pricing for ALL parcel products in Peoria Meadows
 * Using lot width to determine pricing tiers: < 60' vs > 60'
 */

import { sql } from '@vercel/postgres';
import 'dotenv/config';

async function main() {
  console.log('💰 Populating land use pricing for ALL products in Peoria Meadows\n');

  const projectId = 9;

  // Clear existing pricing first
  await sql`DELETE FROM landscape.land_use_pricing WHERE project_id = ${projectId}`;
  console.log('Cleared existing pricing records\n');

  const pricingData = [
    // Commercial
    { lu_code: 'RET', product: 'C', uom: '$/SF', price: 10.00 },
    
    // Multi-Family
    { lu_code: 'MF', product: 'APTS', uom: '$/Unit', price: 25000.00 },
    
    // Single Family Attached - 6/6 and 7/8
    { lu_code: 'SFA', product: '6/6Pack', uom: '$/Unit', price: 50000.00 },
    { lu_code: 'SFA', product: '7/8 Pack', uom: '$/Unit', price: 50000.00 },
    
    // Build-to-Rent
    { lu_code: 'BTR', product: 'BFR SFD', uom: '$/Unit', price: 60000.00 },
    
    // Mixed Use
    { lu_code: 'MX', product: 'MU', uom: '$/SF', price: 10.00 },
    
    // Parks
    { lu_code: 'PARK', product: 'OS', uom: '$/Acre', price: 0.00 },
    
    // SFD - Lots < 60' wide ($2,400/FF)
    { lu_code: 'SFD', product: '35x95', uom: '$/FF', price: 2400.00 },
    { lu_code: 'SFD', product: '40x100', uom: '$/FF', price: 2400.00 },
    { lu_code: 'SFD', product: '40x115', uom: '$/FF', price: 2400.00 },
    { lu_code: 'SFD', product: '45x115', uom: '$/FF', price: 2400.00 },
    { lu_code: 'SFD', product: '50x120', uom: '$/FF', price: 2400.00 },
    { lu_code: 'SFD', product: '50x125', uom: '$/FF', price: 2400.00 },
    { lu_code: 'SFD', product: '55x120', uom: '$/FF', price: 2400.00 },
    { lu_code: 'SFD', product: '55x125', uom: '$/FF', price: 2400.00 },
    
    // SFD - Lots > 60' wide ($2,200/FF - 8.3% DISCOUNT for wider lots)
    { lu_code: 'SFD', product: '60x125', uom: '$/FF', price: 2200.00 },
    { lu_code: 'SFD', product: '65x125', uom: '$/FF', price: 2200.00 },
    { lu_code: 'SFD', product: '70x125', uom: '$/FF', price: 2200.00 },
    { lu_code: 'SFD', product: '70x130', uom: '$/FF', price: 2200.00 },
    { lu_code: 'SFD', product: '80x130', uom: '$/FF', price: 2200.00 },
  ];

  console.log('Inserting pricing records:\n');

  for (const { lu_code, product, uom, price } of pricingData) {
    await sql`
      INSERT INTO landscape.land_use_pricing (
        project_id,
        lu_type_code,
        product_code,
        price_per_unit,
        unit_of_measure
      ) VALUES (
        ${projectId},
        ${lu_code},
        ${product},
        ${price},
        ${uom}
      )
    `;
    console.log(`  ✓ ${lu_code.padEnd(6)} ${product.padEnd(20)} ${uom.padEnd(10)} $${price.toLocaleString().padStart(10)}`);
  }

  console.log(`\n✅ Land use pricing populated successfully! (${pricingData.length} records)\n`);

  // Verification
  const verification = await sql`
    SELECT lu_type_code, product_code, unit_of_measure, price_per_unit
    FROM landscape.land_use_pricing
    WHERE project_id = ${projectId}
    ORDER BY lu_type_code, product_code
  `;

  console.log('Verification - Pricing records in database:');
  console.log(`Total records: ${verification.rows.length}\n`);
  
  // Group by LU type
  const byType = {};
  verification.rows.forEach(row => {
    if (!byType[row.lu_type_code]) byType[row.lu_type_code] = [];
    byType[row.lu_type_code].push(row);
  });
  
  Object.keys(byType).sort().forEach(type => {
    console.log(`  ${type}:`);
    byType[type].forEach(row => {
      console.log(`    ${row.product_code.padEnd(20)} ${row.unit_of_measure.padEnd(10)} $${parseFloat(row.price_per_unit).toLocaleString()}`);
    });
  });
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
