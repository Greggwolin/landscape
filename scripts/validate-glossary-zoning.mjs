#!/usr/bin/env node
import { neon } from '@neondatabase/serverless'

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL is not set')
    process.exit(1)
  }
  const sql = neon(url)

  // Validate enum labels
  const labels = await sql`
    SELECT e.enumlabel AS label
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'land_v2' AND t.typname IN ('code_token_kind','code_token_kind_t')
    ORDER BY e.enumsortorder
  `
  const got = labels.map(l => l.label)
  const expected = ['published','placeholder','numeric','mixed']
  const gotUnique = Array.from(new Set(got))
  const enumOk = gotUnique.length === expected.length && expected.every(v => gotUnique.includes(v))
  if (!enumOk) {
    console.error('Enum labels mismatch. Expected:', expected, 'Got:', got)
    process.exit(2)
  }

  // Validate non-nulls
  const bad = await sql`
    SELECT COUNT(*)::int AS n
    FROM land_v2.glossary_zoning
    WHERE code_token_kind IS NULL OR code_token_confidence IS NULL
  `
  if ((bad[0]?.n ?? 0) > 0) {
    console.error('Found rows with NULL code_token_kind or code_token_confidence:', bad[0]?.n)
    process.exit(3)
  }

  // Validate row counts by jurisdiction (post-seed sanity)
  // Expected: Phoenix=16, Maricopa=20, Peoria=37
  // Be flexible for 'Maricopa' vs 'Maricopa County' naming
  const counts = await sql`
    WITH c AS (
      SELECT LOWER(jurisdiction_city) AS city, LOWER(jurisdiction_state) AS st, COUNT(*)::int AS n
      FROM land_v2.glossary_zoning
      GROUP BY 1,2
    )
    SELECT 
      COALESCE((SELECT n FROM c WHERE city = 'phoenix' AND st = 'az'), 0) AS phoenix,
      COALESCE((SELECT n FROM c WHERE city IN ('maricopa','maricopa county') AND st = 'az' LIMIT 1), 0) AS maricopa,
      COALESCE((SELECT n FROM c WHERE city = 'peoria' AND st = 'az'), 0) AS peoria
  `
  const exp = { phoenix: 16, maricopa: 20, peoria: 37 }
  const gotCounts = counts?.[0] ?? { phoenix: 0, maricopa: 0, peoria: 0 }
  let ok = true
  for (const k of Object.keys(exp)) {
    if (Number(gotCounts[k]) !== exp[k]) ok = false
  }
  if (!ok) {
    console.error('Jurisdiction counts mismatch', { expected: exp, got: gotCounts })
    process.exit(4)
  }

  console.log('glossary_zoning validation OK')
}

main().catch(err => {
  console.error(err)
  process.exit(99)
})
