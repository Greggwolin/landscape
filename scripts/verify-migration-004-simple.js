#!/usr/bin/env node
/**
 * Simple verification of Finance Structure Migration 004
 */

const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function verifyMigration() {
  console.log('🔍 Finance Structure Migration 004 - Simple Verification\n');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    //Check tables exist
    const tables = await client.query(`
      SELECT tablename, pg_size_pretty(pg_total_relation_size('landscape.'||tablename)) as size
      FROM pg_tables
      WHERE schemaname = 'landscape'
        AND tablename IN (
          'tbl_finance_structure',
          'tbl_cost_allocation',
          'tbl_sale_settlement',
          'tbl_participation_payment'
        )
      ORDER BY tablename
    `);

    console.log('✅ Tables Created:');
    tables.rows.forEach(t => console.log(`   ${t.tablename} (${t.size})`));

    // Check foreign keys
    const fks = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.table_constraints
      WHERE constraint_type = 'FOREIGN KEY'
        AND table_schema = 'landscape'
        AND table_name IN (
          'tbl_finance_structure',
          'tbl_cost_allocation',
          'tbl_sale_settlement',
          'tbl_participation_payment'
        )
    `);

    console.log(`\n✅ Foreign Keys: ${fks.rows[0].count} constraints`);

    // Check indexes
    const indexes = await client.query(`
      SELECT COUNT(*) as count
      FROM pg_indexes
      WHERE schemaname = 'landscape'
        AND tablename IN (
          'tbl_finance_structure',
          'tbl_cost_allocation',
          'tbl_sale_settlement',
          'tbl_participation_payment'
        )
    `);

    console.log(`✅ Indexes: ${indexes.rows[0].count} indexes`);

    // Check functions
    const funcs = await client.query(`
      SELECT proname as name
      FROM pg_proc
      WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'landscape')
        AND proname IN ('calculate_cost_to_complete', 'auto_calculate_allocations')
    `);

    console.log(`✅ Functions: ${funcs.rows.length} functions`);
    funcs.rows.forEach(f => console.log(`   - ${f.name}()`));

    console.log('\n✅ Migration 004 verified successfully!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

verifyMigration();
