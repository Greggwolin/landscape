#!/usr/bin/env node
/*
  Generates a Markdown cheat sheet of the live Neon DB schema into docs/db-schema.md
  Usage: DATABASE_URL=postgres://... node scripts/generate-schema-md.mjs
*/

import fs from 'node:fs'
import path from 'node:path'
import { neon } from '@neondatabase/serverless'

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL is not set. Export it or use dotenv before running.')
    process.exit(1)
  }

  const sql = neon(url)

  async function renderSchemaMd(schema) {
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = ${schema} AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `

    const columns = await sql`
      SELECT table_name, column_name, data_type, udt_name, is_nullable, ordinal_position
      FROM information_schema.columns
      WHERE table_schema = ${schema}
      ORDER BY table_name, ordinal_position;
    `

    const fks = await sql`
      SELECT 
        tc.table_name AS table_name,
        kcu.column_name AS column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = ${schema}
      ORDER BY tc.table_name, kcu.column_name;
    `

    const enumLabels = await sql`
      SELECT n.nspname AS nsp, t.typname AS typ, e.enumlabel AS label
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = ${schema}
      ORDER BY t.typname, e.enumsortorder
    `

    const enumsByType = {}
    for (const row of enumLabels) {
      const key = `${row.nsp}.${row.typ}`
      if (!enumsByType[key]) enumsByType[key] = []
      enumsByType[key].push(row.label)
    }

    const byTable = Object.fromEntries(tables.map((t) => [t.table_name, { columns: [], foreignKeys: [] }]))

    for (const c of columns) {
      if (!byTable[c.table_name]) byTable[c.table_name] = { columns: [], foreignKeys: [] }
      // Expand user-defined enum types with labels
      let typeOut = c.data_type
      if (c.data_type === 'USER-DEFINED' && c.udt_name) {
        const key = `${schema}.${c.udt_name}`
        const labels = enumsByType[key]
        typeOut = labels ? `${c.udt_name} { ${labels.join(', ')} }` : c.udt_name
      }
      byTable[c.table_name].columns.push({
        name: c.column_name,
        type: typeOut,
        nullable: c.is_nullable === 'YES',
        position: c.ordinal_position,
      })
    }

    for (const fk of fks) {
      if (!byTable[fk.table_name]) byTable[fk.table_name] = { columns: [], foreignKeys: [] }
      byTable[fk.table_name].foreignKeys.push({
        column: fk.column_name,
        references: { table: fk.foreign_table_name, column: fk.foreign_column_name },
      })
    }

    let md = `# Database Schema: ${schema}\n\n`
    for (const tableName of Object.keys(byTable).sort()) {
      const t = byTable[tableName]
      md += `## ${tableName}\n`
      md += `- Columns:\n`
      for (const col of t.columns) {
        md += `  - ${col.name}: ${col.type}${col.nullable ? '' : ' (not null)'}\n`
      }
      if (t.foreignKeys.length) {
        md += `- Foreign Keys:\n`
        for (const fk of t.foreignKeys) {
          md += `  - ${fk.column} → ${fk.references.table}.${fk.references.column}\n`
        }
      }
      md += `\n`
    }
    return md
  }

  // Build Markdown for both schemas if present
  let md = `Generated: ${new Date().toISOString()}\n\n`
  md += await renderSchemaMd('landscape')
  md += await renderSchemaMd('land_v2')

  const outDir = path.join(process.cwd(), 'docs')
  const outFile = path.join(outDir, 'db-schema.md')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir)
  fs.writeFileSync(outFile, md)

  console.log(`Wrote ${outFile}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
