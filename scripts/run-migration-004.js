#!/usr/bin/env node
/**
 * Run Finance Structure Migration 004
 *
 * This script executes the SQL migration to create:
 * - tbl_finance_structure
 * - tbl_cost_allocation
 * - tbl_sale_settlement
 * - tbl_participation_payment
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  const migrationFile = path.join(__dirname, '../migrations/004_finance_structure_system.sql');

  console.log('🚀 Finance Structure Migration Runner');
  console.log('=====================================\n');

  // Check if migration file exists
  if (!fs.existsSync(migrationFile)) {
    console.error('❌ Migration file not found:', migrationFile);
    process.exit(1);
  }

  // Read migration SQL
  const sql = fs.readFileSync(migrationFile, 'utf8');
  console.log('✅ Migration file loaded:', migrationFile);
  console.log('📄 File size:', (sql.length / 1024).toFixed(2), 'KB\n');

  // Check DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in environment');
    console.error('Make sure .env.local exists with DATABASE_URL');
    process.exit(1);
  }

  console.log('🔌 Connecting to database...');
  console.log('Host:', process.env.DATABASE_URL.match(/\/\/[^:]+:([^@]+@)?([^:/]+)/)?.[2] || 'unknown');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Required for Neon
    }
  });

  try {
    await client.connect();
    console.log('✅ Database connected\n');

    // Check if tables already exist
    console.log('🔍 Checking for existing tables...');
    const existingTables = await client.query(`
      SELECT tablename
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

    if (existingTables.rows.length > 0) {
      console.log('⚠️  Found existing tables:');
      existingTables.rows.forEach(row => {
        console.log('   -', row.tablename);
      });
      console.log('\n❓ These tables already exist. Do you want to continue?');
      console.log('   This will fail if tables exist. Consider running migration rollback first.\n');
    } else {
      console.log('✅ No existing tables found - safe to proceed\n');
    }

    // Run migration
    console.log('🔨 Running migration...\n');
    await client.query(sql);
    console.log('✅ Migration executed successfully!\n');

    // Verify tables were created
    console.log('🔍 Verifying created tables...');
    const createdTables = await client.query(`
      SELECT
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
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

    console.log('\n📊 Created Tables:');
    console.log('==================');
    createdTables.rows.forEach(row => {
      console.log(`✅ ${row.tablename.padEnd(30)} (${row.size})`);
    });

    // Verify indexes
    console.log('\n🔍 Verifying indexes...');
    const indexes = await client.query(`
      SELECT
        tablename,
        indexname
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

    console.log(`✅ Created ${indexes.rows.length} indexes`);

    // Verify functions
    console.log('\n🔍 Verifying functions...');
    const functions = await client.query(`
      SELECT
        proname as function_name,
        pg_get_function_arguments(oid) as arguments
      FROM pg_proc
      WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'landscape')
        AND proname IN ('calculate_cost_to_complete', 'auto_calculate_allocations')
      ORDER BY proname
    `);

    console.log(`✅ Created ${functions.rows.length} functions:`);
    functions.rows.forEach(row => {
      console.log(`   - ${row.function_name}(${row.arguments})`);
    });

    console.log('\n' + '='.repeat(50));
    console.log('✅ Migration 004 completed successfully!');
    console.log('='.repeat(50));
    console.log('\n📝 Next steps:');
    console.log('   1. Update Django models managed=True (if needed)');
    console.log('   2. Create serializers for the new models');
    console.log('   3. Create API endpoints and admin interfaces');
    console.log('   4. Test with sample data\n');

  } catch (error) {
    console.error('\n❌ Migration failed!');
    console.error('Error:', error.message);

    if (error.message.includes('already exists')) {
      console.error('\n💡 Tables already exist. Run rollback migration first.');
    }

    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed\n');
  }
}

// Run the migration
runMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
