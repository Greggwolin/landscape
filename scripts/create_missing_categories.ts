#!/usr/bin/env tsx

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(process.cwd(), '.env.local') });

const MISSING_CATEGORIES = [
  { name: 'Deposit', cost_scope: 'development', cost_type: 'deposit' },
  { name: 'Landscape', cost_scope: 'development', cost_type: 'hard' },
  { name: 'Other', cost_scope: 'development', cost_type: 'other' },
  { name: 'Walls', cost_scope: 'development', cost_type: 'hard' },
];

async function createMissingCategories() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not found in environment');
  }

  const sql = neon(process.env.DATABASE_URL);

  console.log('Creating missing unit cost categories...\n');

  for (const category of MISSING_CATEGORIES) {
    try {
      const result = await sql`
        INSERT INTO landscape.core_unit_cost_category (
          category_name,
          cost_scope,
          cost_type,
          sort_order,
          created_at,
          updated_at
        )
        VALUES (
          ${category.name},
          ${category.cost_scope},
          ${category.cost_type},
          (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM landscape.core_unit_cost_category),
          NOW(),
          NOW()
        )
        ON CONFLICT (cost_scope, category_name) DO NOTHING
        RETURNING category_id, category_name
      `;

      if (result.length > 0) {
        console.log(`✅ Created category: ${category.name} (ID: ${result[0].category_id})`);
      } else {
        console.log(`ℹ️  Category already exists: ${category.name}`);
      }
    } catch (error) {
      console.error(`❌ Failed to create category ${category.name}:`, error);
      throw error;
    }
  }

  console.log('\n✅ All categories ready for import');
}

createMissingCategories().catch((error) => {
  console.error('❌ Failed to create categories:', error);
  process.exit(1);
});
