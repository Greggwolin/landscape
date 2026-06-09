#!/usr/bin/env node

/**
 * TypeScript Type Generator
 * 
 * Generates TypeScript types from the validated database schema
 * to ensure type safety across the application.
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Direct Postgres driver. The @neondatabase/serverless HTTP driver cannot
// resolve the land_v2 database over its endpoint ("database land_v2 does not
// exist"), while the standard Postgres protocol reaches it fine — so this
// script uses pg and runs anywhere with a normal DATABASE_URL.
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load DATABASE_URL from .env.local (quoted OR unquoted) or the environment.
const envPath = join(__dirname, '..', '.env.local');
let DATABASE_URL;
try {
  const envContent = readFileSync(envPath, 'utf8');
  const match = envContent.match(/^\s*DATABASE_URL\s*=\s*["']?([^"'\n]+)["']?/m);
  DATABASE_URL = match ? match[1] : process.env.DATABASE_URL;
} catch (error) {
  DATABASE_URL = process.env.DATABASE_URL;
}

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

// Tagged-template shim matching the previous `sql` interface: `await sql`...``
// returns the rows array. Supports ${param} interpolation via positional args.
const sql = async (strings, ...values) => {
  const text = strings.reduce(
    (acc, s, i) => acc + s + (i < values.length ? `$${i + 1}` : ''),
    '',
  );
  const result = await client.query(text, values);
  return result.rows;
};

// PostgreSQL to TypeScript type mapping
const TYPE_MAPPING = {
  // Integers
  'bigint': 'number',
  'integer': 'number',
  'smallint': 'number',
  
  // Decimals
  'numeric': 'number',
  'decimal': 'number',
  'double precision': 'number',
  'real': 'number',
  
  // Text
  'text': 'string',
  'character varying': 'string',
  'character': 'string',
  'varchar': 'string',
  'char': 'string',
  
  // Dates
  'date': 'string', // ISO date string
  'timestamp without time zone': 'string',
  'timestamp with time zone': 'string',
  'time': 'string',
  
  // Boolean
  'boolean': 'boolean',
  
  // JSON
  'json': 'any',
  'jsonb': 'any',
  
  // UUID
  'uuid': 'string',
  
  // Arrays
  'ARRAY': 'any[]',
};

function postgresTypeToTSType(dataType, udtName) {
  // Handle user-defined types (enums)
  if (dataType === 'USER-DEFINED' && udtName) {
    // Convert enum name to a string union type placeholder
    return `string /* ${udtName} enum */`;
  }
  
  // Handle arrays
  if (dataType.includes('[]')) {
    const baseType = dataType.replace('[]', '');
    const mappedType = TYPE_MAPPING[baseType] || 'any';
    return `${mappedType}[]`;
  }
  
  return TYPE_MAPPING[dataType] || 'any';
}

function toCamelCase(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function toPascalCase(str) {
  const camelCase = toCamelCase(str);
  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
}

function generateInterfaceName(tableName) {
  // Remove prefixes and convert to PascalCase
  const name = tableName
    .replace(/^(tbl_|core_|lu_|vw_)/, '')
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  
  return name;
}

async function generateTypes() {
  console.log('🔧 Generating TypeScript types from database schema...\n');
  
  try {
    // Get detailed schema information
    const columns = await sql`
      SELECT 
        table_schema,
        table_name,
        column_name,
        data_type,
        udt_name,
        is_nullable,
        column_default,
        ordinal_position
      FROM information_schema.columns
      WHERE table_schema IN ('landscape', 'land_v2')
      ORDER BY table_schema, table_name, ordinal_position
    `;

    // Get primary keys
    const primaryKeys = await sql`
      SELECT 
        tc.table_schema,
        tc.table_name,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name 
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema IN ('landscape', 'land_v2')
      ORDER BY tc.table_schema, tc.table_name
    `;

    // Get foreign keys
    const foreignKeys = await sql`
      SELECT 
        tc.table_schema,
        tc.table_name,
        kcu.column_name,
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name 
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name 
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema IN ('landscape', 'land_v2')
      ORDER BY tc.table_schema, tc.table_name, kcu.column_name
    `;

    // Organize data
    const tablesBySchema = {};
    const pkMap = {};
    const fkMap = {};

    // Group columns by table
    columns.forEach(col => {
      const schema = col.table_schema;
      const table = col.table_name;
      const key = `${schema}.${table}`;
      
      if (!tablesBySchema[key]) {
        tablesBySchema[key] = [];
      }
      tablesBySchema[key].push(col);
    });

    // Index primary keys
    primaryKeys.forEach(pk => {
      const key = `${pk.table_schema}.${pk.table_name}`;
      if (!pkMap[key]) pkMap[key] = [];
      pkMap[key].push(pk.column_name);
    });

    // Index foreign keys
    foreignKeys.forEach(fk => {
      const key = `${fk.table_schema}.${fk.table_name}`;
      if (!fkMap[key]) fkMap[key] = [];
      fkMap[key].push({
        column: fk.column_name,
        references: `${fk.foreign_table_schema}.${fk.foreign_table_name}.${fk.foreign_column_name}`
      });
    });

    // Generate TypeScript code
    let tsCode = `// Auto-generated database types
// Generated on: ${new Date().toISOString()}
// DO NOT EDIT MANUALLY - Run 'npm run generate:types' to regenerate

`;

    // Add utility types
    tsCode += `// Utility types
export type Nullable<T> = T | null;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

`;

    // De-dup guard for interface / insert-type names.
    //
    // The schema scan covers TWO Postgres schemas ('landscape' and 'land_v2').
    // generateInterfaceName() strips the table prefix (tbl_/core_/lu_/vw_) and the
    // schema, so identically-named objects collide on the same TS identifier in two
    // distinct ways:
    //   1. Cross-schema: land_v2.glossary_zoning AND landscape.glossary_zoning both
    //      normalize to `GlossaryZoning` / `GlossaryZoningInsert`.
    //   2. Within-schema prefix strip: landscape.tbl_acreage_allocation AND
    //      landscape.vw_acreage_allocation both normalize to `AcreageAllocation`.
    // Emitting the second declaration produces TS2300 (duplicate `type`), TS2717
    // (interface-merge nullability mismatch, e.g. acres `number` vs `number | null`),
    // and TS1117 (duplicate TABLE_NAMES object keys). To keep the output compilable
    // without a DB change, the FIRST declaration of any given name wins and later
    // collisions are skipped. Iteration order is stable (the schema scan is
    // ORDER BY table_schema, table_name), so for a cross-schema collision 'land_v2'
    // (alphabetically before 'landscape') is emitted first and wins; for a
    // within-schema prefix-strip collision the alphabetically-earlier table name
    // wins (e.g. tbl_acreage_allocation before vw_acreage_allocation).
    const emittedInterfaceNames = new Set();

    // Generate interfaces for each table
    Object.entries(tablesBySchema).forEach(([tableKey, tableCols]) => {
      const [schema, tableName] = tableKey.split('.');
      const interfaceName = generateInterfaceName(tableName);
      const pks = pkMap[tableKey] || [];
      const fks = fkMap[tableKey] || [];

      if (emittedInterfaceNames.has(interfaceName)) {
        tsCode += `// SKIPPED duplicate interface name for ${schema}.${tableName} -> ${interfaceName} (already emitted)\n\n`;
        return;
      }
      emittedInterfaceNames.add(interfaceName);

      tsCode += `// ${schema}.${tableName}\n`;
      if (pks.length > 0) {
        tsCode += `// Primary Key: ${pks.join(', ')}\n`;
      }
      if (fks.length > 0) {
        tsCode += `// Foreign Keys: ${fks.map(fk => `${fk.column} -> ${fk.references}`).join(', ')}\n`;
      }
      tsCode += `export interface ${interfaceName} {\n`;
      
      tableCols.forEach(col => {
        const tsType = postgresTypeToTSType(col.data_type, col.udt_name);
        const nullable = col.is_nullable === 'YES' ? ' | null' : '';
        const fieldName = toCamelCase(col.column_name);
        
        // Add JSDoc comment for the field
        if (col.column_default) {
          tsCode += `  /** Default: ${col.column_default} */\n`;
        }
        
        tsCode += `  ${fieldName}: ${tsType}${nullable};\n`;
      });
      
      tsCode += `}\n\n`;
      
      // Generate insert type (excluding auto-generated fields)
      const insertFields = tableCols.filter(col => 
        !col.column_default?.includes('nextval') && // Exclude auto-increment
        !col.column_default?.includes('now()') &&   // Exclude auto timestamps
        !col.column_default?.includes('CURRENT_TIMESTAMP')
      );
      
      if (insertFields.length !== tableCols.length) {
        tsCode += `// Insert type for ${schema}.${tableName} (excludes auto-generated fields)\n`;
        tsCode += `export type ${interfaceName}Insert = {\n`;
        
        insertFields.forEach(col => {
          const tsType = postgresTypeToTSType(col.data_type, col.udt_name);
          const nullable = col.is_nullable === 'YES' || col.column_default ? '?' : '';
          const nullType = col.is_nullable === 'YES' ? ' | null' : '';
          const fieldName = toCamelCase(col.column_name);
          
          tsCode += `  ${fieldName}${nullable}: ${tsType}${nullType};\n`;
        });
        
        tsCode += `};\n\n`;
      }
    });

    // NOTE: the LandscapeSchema / LandV2Schema re-export namespaces were removed.
    // They emitted `export type X = X` aliases whose RHS resolved to the alias
    // itself inside the namespace — self-referential (TS2456, ~87 errors) — and
    // nothing consumed them. Consumers import the top-level interfaces directly.

    // Generate table name constants
    //
    // TABLE_NAMES keys are derived from the table name alone (uppercased), so the
    // same cross-schema collision applies here: land_v2.glossary_zoning and
    // landscape.glossary_zoning both want the key GLOSSARY_ZONING, which TS rejects
    // as a duplicate object property (TS1117). First key wins; later collisions are
    // skipped (same ORDER BY table_schema ordering, so 'land_v2' wins the key).
    const emittedTableNameKeys = new Set();
    tsCode += `// Table name constants\n`;
    tsCode += `export const TABLE_NAMES = {\n`;
    Object.keys(tablesBySchema).forEach(key => {
      const [schema, tableName] = key.split('.');
      const constantName = tableName.toUpperCase();
      if (emittedTableNameKeys.has(constantName)) {
        tsCode += `  // SKIPPED duplicate key ${constantName} for ${schema}.${tableName} (already emitted)\n`;
        return;
      }
      emittedTableNameKeys.add(constantName);
      tsCode += `  ${constantName}: '${schema}.${tableName}' as const,\n`;
    });
    tsCode += `} as const;\n\n`;

    tsCode += `// Table name type\n`;
    tsCode += `export type TableName = typeof TABLE_NAMES[keyof typeof TABLE_NAMES];\n`;

    // Write the types file
    const outputPath = join(__dirname, '..', 'src', 'types', 'database.ts');
    writeFileSync(outputPath, tsCode);
    
    console.log(`✅ Generated TypeScript types:`);
    console.log(`   📁 ${outputPath}`);
    console.log(`   📊 ${Object.keys(tablesBySchema).length} interfaces generated`);
    console.log(`   🔗 Primary and foreign key annotations included`);
    console.log(`   📝 Insert types for tables with auto-generated fields`);
    
    return {
      outputPath,
      tableCount: Object.keys(tablesBySchema).length,
      interfaces: Object.keys(tablesBySchema).map(key => generateInterfaceName(key.split('.')[1]))
    };
    
  } catch (error) {
    console.error('❌ Type generation failed:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

// Run type generation
generateTypes()
  .then(result => {
    console.log('\n🎉 Type generation complete!');
    console.log('💡 Add this to your package.json scripts:');
    console.log('   "generate:types": "node scripts/generate-types.mjs"');
  })
  .catch(error => {
    console.error('💥 Type generation error:', error);
    process.exit(1);
  });