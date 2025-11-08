#!/usr/bin/env tsx

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(process.cwd(), '.env.local') });

async function verifyImport() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not found in environment');
  }

  const sql = neon(process.env.DATABASE_URL);

  console.log('\n📊 UNIT COST IMPORT VERIFICATION\n');
  console.log('='.repeat(80));

  // Get total count
  const [{ count }] = await sql`
    SELECT COUNT(*) as count
    FROM landscape.core_unit_cost_template
  `;
  console.log(`\n✅ Total unit cost templates in database: ${count}`);

  // Get count by category
  const categoryStats = await sql`
    SELECT
      c.category_name,
      COUNT(t.template_id) as template_count
    FROM landscape.core_unit_cost_category c
    LEFT JOIN landscape.core_unit_cost_template t ON c.category_id = t.category_id
    WHERE c.cost_scope = 'development'
    GROUP BY c.category_name
    ORDER BY template_count DESC, c.category_name
  `;

  console.log('\n📈 Templates per Category:');
  console.log('-'.repeat(80));
  categoryStats.forEach((row: any) => {
    console.log(`  ${row.category_name.padEnd(30)} : ${row.template_count.toString().padStart(3)} items`);
  });

  // Sample from different categories
  console.log('\n\n🔍 Sample Data from Different Categories:\n');
  console.log('='.repeat(80));

  const samples = await sql`
    SELECT
      t.item_name,
      t.quantity,
      t.typical_mid_value as price,
      t.default_uom_code as uom,
      t.source,
      c.category_name as category
    FROM landscape.core_unit_cost_template t
    JOIN landscape.core_unit_cost_category c ON t.category_id = c.category_id
    WHERE c.category_name IN ('Concrete', 'Grading / Site Prep', 'Landscape', 'Paving', 'Water')
    ORDER BY c.category_name, t.item_name
    LIMIT 15
  `;

  let currentCategory = '';
  samples.forEach((row: any) => {
    if (row.category !== currentCategory) {
      currentCategory = row.category;
      console.log(`\n${currentCategory}:`);
      console.log('-'.repeat(80));
    }
    console.log(`  ${row.item_name}`);
    console.log(`    Qty: ${row.quantity ?? 'null'}, Price: $${row.price ?? 'null'}, UOM: ${row.uom}, Source: ${row.source}`);
  });

  // Check for missing data
  console.log('\n\n⚠️  Data Quality Check:\n');
  console.log('='.repeat(80));

  const missingPrice = await sql`
    SELECT COUNT(*) as count
    FROM landscape.core_unit_cost_template
    WHERE typical_mid_value IS NULL
  `;
  console.log(`Items with missing Price: ${missingPrice[0].count}`);

  const missingQty = await sql`
    SELECT COUNT(*) as count
    FROM landscape.core_unit_cost_template
    WHERE quantity IS NULL
  `;
  console.log(`Items with missing Quantity: ${missingQty[0].count} (this may be intentional)`);

  const missingUom = await sql`
    SELECT COUNT(*) as count
    FROM landscape.core_unit_cost_template
    WHERE default_uom_code IS NULL OR default_uom_code = ''
  `;
  console.log(`Items with missing UOM: ${missingUom[0].count}`);

  // Verify source data
  const sourceCounts = await sql`
    SELECT
      source,
      COUNT(*) as count
    FROM landscape.core_unit_cost_template
    GROUP BY source
    ORDER BY count DESC
  `;

  console.log('\n📋 Data Sources:');
  console.log('-'.repeat(80));
  sourceCounts.forEach((row: any) => {
    console.log(`  ${(row.source || '(empty)').padEnd(40)} : ${row.count.toString().padStart(3)} items`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('✅ Verification complete!\n');
}

verifyImport().catch((error) => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});
