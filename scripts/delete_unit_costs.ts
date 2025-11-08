#!/usr/bin/env tsx

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(process.cwd(), '.env.local') });

async function deleteAllUnitCosts() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not found in environment');
  }

  const sql = neon(process.env.DATABASE_URL);
  const result = await sql`DELETE FROM landscape.core_unit_cost_template`;
  console.log(`✅ Deleted ${result.length} unit cost templates`);
}

deleteAllUnitCosts().catch((error) => {
  console.error('❌ Failed to delete unit cost templates:', error);
  process.exit(1);
});
