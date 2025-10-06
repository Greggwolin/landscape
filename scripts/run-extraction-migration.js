/**
 * Database Migration Script - DMS Extraction Tables
 *
 * Creates dms_extract_queue, dms_unmapped, and dms_assertion tables
 */

const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🗃️  Running DMS Extraction Tables Migration...\n');

  // Load DATABASE_URL from environment
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ ERROR: DATABASE_URL environment variable not set');
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  // Read SQL migration file
  const sqlPath = path.join(__dirname, '../src/app/api/ai/database-schema.sql');

  if (!fs.existsSync(sqlPath)) {
    console.error(`❌ ERROR: SQL file not found at ${sqlPath}`);
    process.exit(1);
  }

  const migrationSQL = fs.readFileSync(sqlPath, 'utf-8');

  console.log('📄 SQL Migration File Loaded');
  console.log(`   Path: ${sqlPath}`);
  console.log(`   Size: ${migrationSQL.length} characters\n`);

  try {
    console.log('⚙️  Executing migration...\n');

    // Execute the full migration SQL
    // Note: We need to split on semicolons and execute each statement separately
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let skipCount = 0;

    for (const statement of statements) {
      // Skip pure comments
      if (statement.startsWith('COMMENT ON')) {
        try {
          await sql(statement);
          console.log('✅ Added comment');
          successCount++;
        } catch (error) {
          console.log('⚠️  Comment skipped (may already exist)');
          skipCount++;
        }
        continue;
      }

      // Skip CREATE FUNCTION statements for now (complex parsing needed)
      if (statement.includes('CREATE OR REPLACE FUNCTION')) {
        console.log('⚠️  Skipping function creation (run manually if needed)');
        skipCount++;
        continue;
      }

      try {
        await sql(statement);

        // Determine what was created
        if (statement.includes('CREATE TABLE')) {
          const tableName = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+\.\w+)/)?.[1];
          console.log(`✅ Table created/verified: ${tableName}`);
        } else if (statement.includes('CREATE INDEX')) {
          const indexName = statement.match(/CREATE INDEX (?:IF NOT EXISTS )?(\w+)/)?.[1];
          console.log(`✅ Index created/verified: ${indexName}`);
        } else if (statement.includes('ALTER TABLE')) {
          console.log('✅ Table altered');
        } else {
          console.log('✅ Statement executed');
        }

        successCount++;
      } catch (error) {
        // Check if it's a "relation already exists" error (not critical)
        if (error.message && error.message.includes('already exists')) {
          console.log('⚠️  Resource already exists (skipped)');
          skipCount++;
        } else {
          console.error('❌ Error executing statement:', error.message);
          console.error('Statement:', statement.substring(0, 100) + '...');
          throw error;
        }
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log(`   ${successCount} statements executed`);
    console.log(`   ${skipCount} statements skipped\n`);

    // Verify tables exist
    console.log('🔍 Verifying tables...\n');

    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'landscape'
        AND table_name IN ('dms_extract_queue', 'dms_unmapped', 'dms_assertion')
      ORDER BY table_name
    `;

    console.log('📊 Tables in landscape schema:');
    tables.forEach(t => {
      console.log(`   ✓ ${t.table_name}`);
    });

    if (tables.length === 3) {
      console.log('\n✅ All tables verified!\n');
    } else {
      console.log(`\n⚠️  Warning: Expected 3 tables, found ${tables.length}\n`);
    }

    // Show sample structure
    console.log('📋 Table Structures:\n');

    for (const tableName of ['dms_extract_queue', 'dms_unmapped', 'dms_assertion']) {
      const columns = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'landscape'
          AND table_name = ${tableName}
        ORDER BY ordinal_position
      `;

      console.log(`   ${tableName}:`);
      columns.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        console.log(`     - ${col.column_name}: ${col.data_type} ${nullable}`);
      });
      console.log('');
    }

    console.log('✅ Migration complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
runMigration();
