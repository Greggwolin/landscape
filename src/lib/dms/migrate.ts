#!/usr/bin/env node
/**
 * DMS Migration Runner
 * Applies database migrations for the Document Management System
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { sql } from '@/lib/db';

async function runMigration() {
  try {
    console.log('🚀 Starting DMS migration...');
    
    const migrationPath = join(__dirname, 'migrations', '001_create_dms_tables.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    console.log('📄 Executing migration: 001_create_dms_tables.sql');
    
    // Execute the migration
    await sql.unsafe(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify tables were created
    console.log('🔍 Verifying tables...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'landscape' 
        AND table_name LIKE 'dms_%' OR table_name = 'core_doc'
      ORDER BY table_name
    `;
    
    console.log('📋 Created tables:');
    tables.forEach((table: any) => {
      console.log(`  ✓ ${table.table_name}`);
    });
    
    // Check materialized view
    const views = await sql`
      SELECT matviewname as view_name
      FROM pg_matviews 
      WHERE schemaname = 'landscape' 
        AND matviewname = 'mv_doc_search'
    `;
    
    if (views.length > 0) {
      console.log('📊 Created materialized views:');
      views.forEach((view: any) => {
        console.log(`  ✓ ${view.view_name}`);
      });
    }
    
    // Check default data
    const workspaces = await sql`
      SELECT workspace_code, workspace_name 
      FROM landscape.dms_workspaces
      ORDER BY workspace_id
    `;
    
    const attributes = await sql`
      SELECT attr_key, attr_name, attr_type
      FROM landscape.dms_attributes
      ORDER BY display_order
    `;
    
    const templates = await sql`
      SELECT template_name, is_default
      FROM landscape.dms_templates
      ORDER BY template_id
    `;
    
    console.log(`📊 Seeded data:`);
    console.log(`  ✓ ${workspaces.length} workspaces`);
    console.log(`  ✓ ${attributes.length} attributes`);
    console.log(`  ✓ ${templates.length} templates`);
    
    console.log('\n🎉 DMS migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration().then(() => process.exit(0));
}

export { runMigration };