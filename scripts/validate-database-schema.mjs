#!/usr/bin/env node

/**
 * Schema Validation Script
 * 
 * Validates the actual Neon database structure against our expected schema
 * and identifies discrepancies, missing tables, or schema mismatches.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import the Neon client
import { neon } from '@neondatabase/serverless';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(__dirname, '..', '.env.local');
let DATABASE_URL;
try {
  const envContent = readFileSync(envPath, 'utf8');
  const match = envContent.match(/DATABASE_URL="([^"]+)"/);
  DATABASE_URL = match ? match[1] : process.env.DATABASE_URL;
} catch (error) {
  DATABASE_URL = process.env.DATABASE_URL;
}

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env.local or environment variables');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// Load expected schema from JSON export
const schemaJsonPath = join(__dirname, '..', 'LocalFiles', 'landscape_neon_91225b.json');
let expectedSchema;
try {
  const schemaContent = readFileSync(schemaJsonPath, 'utf8');
  expectedSchema = JSON.parse(schemaContent);
} catch (error) {
  console.error('❌ Could not load schema JSON:', error.message);
  process.exit(1);
}

async function validateSchema() {
  console.log('🔍 Validating database schema...\n');
  
  try {
    // 1. Check available schemas
    console.log('📋 Available schemas:');
    const schemas = await sql`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY schema_name
    `;
    schemas.forEach(s => console.log(`  • ${s.schema_name}`));
    console.log();

    // 2. Get all tables across schemas
    console.log('📊 Discovering actual table structure:');
    const actualTables = await sql`
      SELECT 
        table_schema,
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY table_schema, table_name, ordinal_position
    `;

    // 3. Organize expected schema by table
    const expectedByTable = {};
    expectedSchema.forEach(col => {
      const tableName = col.table_name;
      if (!expectedByTable[tableName]) {
        expectedByTable[tableName] = [];
      }
      expectedByTable[tableName].push(col);
    });

    // 4. Organize actual schema by table
    const actualBySchema = {};
    actualTables.forEach(col => {
      const schema = col.table_schema;
      if (!actualBySchema[schema]) actualBySchema[schema] = {};
      const tableName = col.table_name;
      if (!actualBySchema[schema][tableName]) {
        actualBySchema[schema][tableName] = [];
      }
      actualBySchema[schema][tableName].push(col);
    });

    // 5. Validation Results
    console.log('✅ SCHEMA VALIDATION RESULTS\n');
    
    const totalExpected = Object.keys(expectedByTable).length;
    let totalFound = 0;
    const missingTables = [];
    const foundTables = [];
    const schemaMapping = {};

    // Check each expected table
    for (const [expectedTable, expectedCols] of Object.entries(expectedByTable)) {
      let found = false;
      let foundSchema = null;
      
      // Look for this table across all schemas
      for (const [schema, tables] of Object.entries(actualBySchema)) {
        if (tables[expectedTable]) {
          found = true;
          foundSchema = schema;
          totalFound++;
          foundTables.push({ table: expectedTable, schema, columns: tables[expectedTable].length });
          schemaMapping[expectedTable] = schema;
          break;
        }
      }
      
      if (!found) {
        missingTables.push(expectedTable);
      }
    }

    // Report findings
    console.log(`📈 Table Coverage: ${totalFound}/${totalExpected} tables found (${Math.round(totalFound/totalExpected*100)}%)`);
    
    if (foundTables.length > 0) {
      console.log('\n✅ Found Tables:');
      foundTables.forEach(t => {
        console.log(`  • ${t.schema}.${t.table} (${t.columns} columns)`);
      });
    }

    if (missingTables.length > 0) {
      console.log('\n❌ Missing Tables:');
      missingTables.forEach(t => console.log(`  • ${t}`));
    }

    // 6. Schema distribution analysis
    console.log('\n📊 Schema Distribution:');
    const schemaCounts = {};
    Object.values(schemaMapping).forEach(schema => {
      schemaCounts[schema] = (schemaCounts[schema] || 0) + 1;
    });
    
    Object.entries(schemaCounts).forEach(([schema, count]) => {
      console.log(`  • ${schema}: ${count} tables`);
    });

    // 7. Check for extra tables not in expected schema
    console.log('\n🔍 Additional tables in database:');
    const allActualTables = new Set();
    Object.values(actualBySchema).forEach(schemaObj => {
      Object.keys(schemaObj).forEach(tableName => {
        allActualTables.add(tableName);
      });
    });
    
    const extraTables = Array.from(allActualTables).filter(t => !expectedByTable[t]);
    if (extraTables.length > 0) {
      extraTables.forEach(t => {
        // Find which schema it's in
        for (const [schema, tables] of Object.entries(actualBySchema)) {
          if (tables[t]) {
            console.log(`  • ${schema}.${t} (${tables[t].length} columns)`);
            break;
          }
        }
      });
    } else {
      console.log('  None - all database tables match expected schema');
    }

    // 8. Generate recommended updates
    console.log('\n🔧 RECOMMENDED ACTIONS:');
    
    // Check current app queries for schema mismatches
    const currentQueries = [
      'landscape.tbl_project', // From projects API
    ];
    
    console.log('\n📋 Current App Query Validation:');
    for (const query of currentQueries) {
      const [querySchema, queryTable] = query.split('.');
      const actualSchema = schemaMapping[queryTable];
      
      if (actualSchema) {
        if (actualSchema === querySchema) {
          console.log(`  ✅ ${query} - correct`);
        } else {
          console.log(`  ❌ ${query} - should be ${actualSchema}.${queryTable}`);
        }
      } else {
        console.log(`  ❓ ${query} - table not found in schema`);
      }
    }

    console.log('\n📝 Summary & Next Steps:');
    console.log(`  1. ${totalFound} of ${totalExpected} expected tables found`);
    console.log(`  2. ${missingTables.length} tables missing from database`);
    console.log(`  3. ${extraTables.length} additional tables in database`);
    
    if (totalFound === totalExpected) {
      console.log('\n🎉 Schema validation passed! All expected tables found.');
    } else {
      console.log(`\n⚠️  Schema validation incomplete. ${totalExpected - totalFound} tables missing.`);
    }

    return {
      success: totalFound === totalExpected,
      totalExpected,
      totalFound,
      missingTables,
      extraTables,
      schemaMapping,
      foundTables
    };

  } catch (error) {
    console.error('❌ Schema validation failed:', error.message);
    throw error;
  }
}

// Run validation
validateSchema()
  .then(result => {
    console.log('\n✨ Validation complete');
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Validation error:', error);
    process.exit(1);
  });