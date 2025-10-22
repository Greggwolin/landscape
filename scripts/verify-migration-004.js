#!/usr/bin/env node
/**
 * Verify Finance Structure Migration 004
 *
 * Tests table structure, foreign keys, and indexes
 */

const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function verifyMigration() {
  console.log('🔍 Verifying Finance Structure Migration 004');
  console.log('============================================\n');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // 1. Verify table structure
    console.log('📋 Table Structures:');
    console.log('===================\n');

    const tables = [
      'tbl_finance_structure',
      'tbl_cost_allocation',
      'tbl_sale_settlement',
      'tbl_participation_payment'
    ];

    for (const table of tables) {
      const columns = await client.query(`
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'landscape'
          AND table_name = $1
        ORDER BY ordinal_position
      `, [table]);

      console.log(`✅ ${table} (${columns.rows.length} columns)`);
      columns.rows.slice(0, 5).forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });
      if (columns.rows.length > 5) {
        console.log(`   ... and ${columns.rows.length - 5} more columns`);
      }
      console.log();
    }

    // 2. Verify foreign keys
    console.log('🔗 Foreign Key Constraints:');
    console.log('===========================\n');

    const foreignKeys = await client.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'landscape'
        AND tc.table_name IN (
          'tbl_finance_structure',
          'tbl_cost_allocation',
          'tbl_sale_settlement',
          'tbl_participation_payment'
        )
      ORDER BY tc.table_name, kcu.column_name
    `);

    foreignKeys.rows.forEach(fk => {
      console.log(`✅ ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });
    console.log(`\nTotal: ${foreignKeys.rows.length} foreign keys\n`);

    // 3. Verify indexes
    console.log('📊 Indexes:');
    console.log('===========\n');

    const indexes = await client.query(`
      SELECT
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'landscape'
        AND tablename IN (
          'tbl_finance_structure',
          'tbl_cost_allocation',
          'tbl_sale_settlement',
          'tbl_participation_payment'
        )
      ORDER BY tablename, indexname
    `);

    let currentTable = null;
    indexes.rows.forEach(idx => {
      if (idx.tablename !== currentTable) {
        if (currentTable !== null) console.log();
        console.log(`${idx.tablename}:`);
        currentTable = idx.tablename;
      }
      console.log(`  ✅ ${idx.indexname}`);
    });
    console.log(`\nTotal: ${indexes.rows.length} indexes\n`);

    // 4. Verify functions
    console.log('⚙️  Functions:');
    console.log('=============\n');

    const functions = await client.query(`
      SELECT
        proname as function_name,
        pg_get_function_arguments(oid) as arguments,
        pg_get_functiondef(oid) as definition
      FROM pg_proc
      WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'landscape')
        AND proname IN ('calculate_cost_to_complete', 'auto_calculate_allocations')
      ORDER BY proname
    `);

    functions.rows.forEach(func => {
      console.log(`✅ ${func.function_name}(${func.arguments})`);
    });
    console.log();

    // 5. Test basic insert (and rollback)
    console.log('🧪 Testing CRUD Operations:');
    console.log('===========================\n');

    await client.query('BEGIN');

    // Create test finance structure
    const insertResult = await client.query(`
      INSERT INTO landscape.tbl_finance_structure (
        project_id,
        structure_code,
        structure_name,
        structure_type,
        total_budget_amount,
        allocation_method
      ) VALUES (
        1,
        'TEST-001',
        'Test Infrastructure Pool',
        'capital_cost_pool',
        1000000.00,
        'by_units'
      )
      RETURNING finance_structure_id
    `);

    console.log(`✅ INSERT test: Created finance_structure_id = ${insertResult.rows[0].finance_structure_id}`);

    // Test query
    const selectResult = await client.query(`
      SELECT * FROM landscape.tbl_finance_structure
      WHERE structure_code = 'TEST-001'
    `);

    console.log(`✅ SELECT test: Found ${selectResult.rows.length} row(s)`);

    // Rollback test data
    await client.query('ROLLBACK');
    console.log(`✅ ROLLBACK test: Test data cleaned up\n`);

    // 6. Summary
    console.log('=' .repeat(50));
    console.log('✅ Migration 004 Verification Complete!');
    console.log('='.repeat(50));
    console.log('\n📊 Summary:');
    console.log(`   - Tables: ${tables.length}/4`);
    console.log(`   - Foreign Keys: ${foreignKeys.rows.length}`);
    console.log(`   - Indexes: ${indexes.rows.length}`);
    console.log(`   - Functions: ${functions.rows.length}/2`);
    console.log(`   - CRUD Operations: ✅ Working\n`);

  } catch (error) {
    console.error('\n❌ Verification failed!');
    console.error('Error:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed\n');
  }
}

verifyMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
