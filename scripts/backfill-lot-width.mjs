#!/usr/bin/env node
/**
 * Backfill lot_width values for parcels that have lot products but missing lot_width
 */

import { sql } from '@vercel/postgres';
import 'dotenv/config';

async function main() {
  console.log('🔍 Finding parcels with products but missing lot_width...\n');

  // Get all parcels that have a product but missing lot_width
  const parcelsResult = await sql`
    SELECT
      parcel_id,
      project_id,
      lot_product,
      product_code,
      lot_width,
      units_total,
      acres_gross
    FROM landscape.tbl_parcel
    WHERE lot_product IS NOT NULL
      AND lot_product != ''
      AND (lot_width IS NULL OR lot_width = 0)
    ORDER BY project_id, parcel_id
  `;

  const parcels = parcelsResult.rows;
  console.log(`Found ${parcels.length} parcels needing lot_width backfill\n`);

  if (parcels.length === 0) {
    console.log('✅ No parcels need updating!');
    return;
  }

  // Get all lot products from res_lot_product for matching
  const resLotProductsResult = await sql`
    SELECT code, lot_w_ft, lot_d_ft, lot_area_sf
    FROM landscape.res_lot_product
  `;

  const resLotProducts = resLotProductsResult.rows;
  const lotProductMap = new Map(
    resLotProducts.map(p => [p.code, { width: p.lot_w_ft, depth: p.lot_d_ft, area: p.lot_area_sf }])
  );

  console.log(`Loaded ${resLotProducts.length} residential lot products from database\n`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const parcel of parcels) {
    const productCode = parcel.lot_product || parcel.product_code || '';
    let lotWidth = null;

    // First, try to find in res_lot_product table
    if (lotProductMap.has(productCode)) {
      lotWidth = lotProductMap.get(productCode).width;
      console.log(`✓ Parcel ${parcel.parcel_id}: Found "${productCode}" in res_lot_product → width = ${lotWidth}`);
    }
    // If not found, try to parse from product code format "WIDTHxDEPTH"
    else {
      const match = productCode.match(/^(\d+)x(\d+)$/);
      if (match) {
        lotWidth = parseInt(match[1], 10);
        console.log(`✓ Parcel ${parcel.parcel_id}: Parsed "${productCode}" → width = ${lotWidth}`);
      } else {
        console.log(`⚠ Parcel ${parcel.parcel_id}: Cannot determine width for product "${productCode}" (skipped)`);
        skippedCount++;
        continue;
      }
    }

    // Update the parcel
    if (lotWidth && lotWidth > 0) {
      await sql`
        UPDATE landscape.tbl_parcel
        SET lot_width = ${lotWidth}
        WHERE parcel_id = ${parcel.parcel_id}
      `;
      updatedCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Successfully updated ${updatedCount} parcels`);
  console.log(`⚠️  Skipped ${skippedCount} parcels (non-standard product codes)`);
  console.log('='.repeat(60));

  // Show summary by project
  console.log('\nSummary by project:');
  const projectsResult = await sql`
    SELECT
      p.project_id,
      pr.project_name,
      COUNT(*) as total_parcels,
      COUNT(CASE WHEN p.lot_width > 0 THEN 1 END) as with_lot_width,
      COUNT(CASE WHEN p.lot_product IS NOT NULL AND p.lot_product != '' AND (p.lot_width IS NULL OR p.lot_width = 0) THEN 1 END) as missing_lot_width
    FROM landscape.tbl_parcel p
    LEFT JOIN landscape.tbl_project pr ON pr.project_id = p.project_id
    WHERE p.lot_product IS NOT NULL AND p.lot_product != ''
    GROUP BY p.project_id, pr.project_name
    ORDER BY p.project_id
  `;

  const projects = projectsResult.rows;
  projects.forEach(proj => {
    console.log(`  Project ${proj.project_id} (${proj.project_name || 'Unnamed'}): ${proj.with_lot_width}/${proj.total_parcels} have lot_width (${proj.missing_lot_width} still missing)`);
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
