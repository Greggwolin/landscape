#!/usr/bin/env node
import { readFileSync, readdirSync } from 'fs'
import { join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { neon } from '@neondatabase/serverless'

const __filename = fileURLToPath(import.meta.url)
const __dirname = resolve(__filename, '..')
const projectRoot = resolve(__dirname, '..')

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  try {
    const envPath = join(projectRoot, '.env.local')
    const envContent = readFileSync(envPath, 'utf8')
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const [key, ...rest] = trimmed.split('=')
      if (key === 'DATABASE_URL') {
        const rawVal = rest.join('=')
        return rawVal.replace(/^"|"$/g, '')
      }
    }
  } catch (error) {
    console.warn('⚠️  Could not read .env.local for DATABASE_URL:', error.message)
  }
  return null
}

async function main() {
  const databaseUrl = loadDatabaseUrl()
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found. Set it in the environment or .env.local.')
    process.exit(1)
  }

  const sql = neon(databaseUrl)
  const migrationsDir = join(projectRoot, 'db', 'migrations')
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.up.sql'))
    .sort()

  if (files.length === 0) {
    console.log('No migrations found.')
    return
  }

  for (const file of files) {
    const fullPath = join(migrationsDir, file)
    const contents = readFileSync(fullPath, 'utf8')
    console.log(`\n▶️  Running migration ${file}`)
    const statements = contents
      .split(/;\s*(?:\n|$)/)
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && stmt.toUpperCase() !== 'BEGIN' && stmt.toUpperCase() !== 'COMMIT')

    try {
      for (const statement of statements) {
        if (!statement) continue
        console.log(`   → ${statement.slice(0,80)}${statement.length > 80 ? '...' : ''}`)

        if (statement.includes('ADD CONSTRAINT IF NOT EXISTS')) {
          const match = statement.match(/ALTER\s+TABLE\s+([^\s]+)\s+ADD\s+CONSTRAINT\s+IF\s+NOT\s+EXISTS\s+([^\s]+)\s+(.*)/is)
          if (!match) {
            throw new Error(`Unable to parse constraint statement: ${statement}`)
          }
          const [, tableName, constraintName, remainder] = match
          const existing = await sql`SELECT 1 FROM pg_constraint WHERE conname = ${constraintName} LIMIT 1`
          if (existing.length === 0) {
            const altered = `ALTER TABLE ${tableName} ADD CONSTRAINT ${constraintName} ${remainder}`
            await sql.query(altered)
          }
          continue
        }

        await sql.query(statement)
      }
      console.log(`✅ Completed ${file}`)
    } catch (error) {
      console.error(`❌ Migration ${file} failed at statement:`)
      console.error(error)
      process.exit(1)
    }
  }

  console.log('\nAll migrations applied successfully.')
}

main().catch((error) => {
  console.error('❌ Unexpected error running migrations:', error)
  process.exit(1)
})
