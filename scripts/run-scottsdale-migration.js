#!/usr/bin/env node

/**
 * Execute Scottsdale Promenade tenant roster migration
 * Loads 41 spaces, 39 tenants, and 5 sample leases into the database
 */

const fs = require('fs');
const path = require('path');

async function runMigration() {
  // Dynamically import pg module
  const { Client } = await import('pg');

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ ERROR: DATABASE_URL environment variable not found');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('📡 Connecting to Neon database...');
    await client.connect();
    console.log('✅ Connected successfully');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'load_scottsdale_roster.sql');
    console.log(`\n📄 Reading SQL file: ${sqlPath}`);
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('\n🚀 Executing migration...');
    console.log('   - Deleting previous demo data');
    console.log('   - Loading 41 spaces');
    console.log('   - Loading 39 tenants');
    console.log('   - Creating 5 sample leases');
    console.log('');

    // Execute the SQL
    await client.query(sql);

    console.log('✅ Migration completed successfully!\n');

    // Run validation queries
    console.log('📊 Running validation queries...\n');

    // Total GLA
    const glaResult = await client.query(`
      SELECT SUM(rentable_sf) as total_gla
      FROM landscape.tbl_cre_space
      WHERE cre_property_id = 3
    `);
    console.log(`   Total GLA: ${Number(glaResult.rows[0].total_gla).toLocaleString()} SF`);

    // Occupancy
    const occupancyResult = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE space_status = 'Leased') as leased_spaces,
        COUNT(*) FILTER (WHERE space_status = 'Available') as vacant_spaces,
        COUNT(*) as total_spaces,
        SUM(rentable_sf) FILTER (WHERE space_status = 'Leased') as leased_sf,
        SUM(rentable_sf) FILTER (WHERE space_status = 'Available') as vacant_sf,
        ROUND((SUM(rentable_sf) FILTER (WHERE space_status = 'Leased')::numeric / SUM(rentable_sf) * 100), 1) as occupancy_pct
      FROM landscape.tbl_cre_space
      WHERE cre_property_id = 3
    `);

    const occ = occupancyResult.rows[0];
    console.log(`   Total Spaces: ${occ.total_spaces}`);
    console.log(`   Leased: ${occ.leased_spaces} spaces (${Number(occ.leased_sf).toLocaleString()} SF)`);
    console.log(`   Vacant: ${occ.vacant_spaces} spaces (${Number(occ.vacant_sf).toLocaleString()} SF)`);
    console.log(`   Occupancy: ${occ.occupancy_pct}%`);

    // Leases
    const leaseResult = await client.query(`
      SELECT COUNT(*) as lease_count
      FROM landscape.tbl_cre_lease
      WHERE cre_property_id = 3
    `);
    console.log(`   Leases Created: ${leaseResult.rows[0].lease_count}`);

    // Tenants
    const tenantResult = await client.query(`
      SELECT COUNT(*) as tenant_count
      FROM landscape.tbl_cre_tenant
      WHERE tenant_id >= 1000
    `);
    console.log(`   Tenants Loaded: ${tenantResult.rows[0].tenant_count}`);

    console.log('\n✅ Scottsdale Promenade data successfully loaded!');
    console.log('   Navigate to: /properties/3/analysis to view the rent roll\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    if (error.detail) console.error('   Details:', error.detail);
    if (error.hint) console.error('   Hint:', error.hint);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Load .env.local
require('dotenv').config({ path: '.env.local' });

// Run migration
runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
