#!/usr/bin/env node
/**
 * Populate land use pricing for Peoria Meadows
 */

import { sql } from '@vercel/postgres';
import 'dotenv/config';

async function main() {
  console.log('💰 Populating land use pricing for Peoria Meadows\n');

  const projectId = 9;

  // Clear existing pricing first
  await sql`DELETE FROM landscape.land_use_pricing WHERE project_id = ${projectId}`;
  console.log('Cleared existing pricing records\n');

  const pricingData = [
    { lu_code: 'RET', product: 'C', uom: '$/SF', price: 10.00 },
    { lu_code: 'MF', product: 'APTS', uom: '$/Unit', price: 25000.00 },
    { lu_code: 'SFD', product: '50x125 wide', uom: '$/FF', price: 2400.00 },
    { lu_code: 'SFA', product: '66, 7/8', uom: '$/Unit', price: 50000.00 },
    { lu_code: 'SFD', product: 'Lots > 60\' wide', uom: '$/FF', price: 2400.00 },
    { lu_code: 'BTR', product: 'BTR', uom: '$/Unit', price: 60000.00 },
    { lu_code: 'MX', product: 'MU', uom: '$/SF', price: 10.00 },
    { lu_code: 'PARK', product: 'OS', uom: '$/Acre', price: 0.00 }
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

  console.log('\n✅ Land use pricing populated successfully!\n');

  // Verification
  const verification = await sql`
    SELECT lu_type_code, unit_of_measure, price_per_unit
    FROM landscape.land_use_pricing
    WHERE project_id = ${projectId}
    ORDER BY lu_type_code
  `;

  console.log('Verification - Pricing records in database:');
  verification.rows.forEach(row => {
    console.log(`  ${row.lu_type_code}: ${row.unit_of_measure} = $${parseFloat(row.price_per_unit).toLocaleString()}`);
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
