#!/usr/bin/env node
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'
import { neon } from '@neondatabase/serverless'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  try {
    const envContent = readFileSync(join(projectRoot, '.env.local'), 'utf8')
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const [key, ...rest] = trimmed.split('=')
      if (key === 'DATABASE_URL') {
        return rest.join('=').replace(/^"|"$/g, '')
      }
    }
  } catch (error) {
    console.warn('⚠️  Could not read .env.local:', error.message)
  }
  return null
}

async function main() {
  const databaseUrl = loadDatabaseUrl()
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found.')
    process.exit(1)
  }

  const projectId = Number(process.argv[2] || 7)
  if (!Number.isFinite(projectId)) {
    console.error('❌ Provide a numeric project id as the first argument.')
    process.exit(1)
  }

  const sql = neon(databaseUrl)

  const [{ count: projectExists } = { count: 0 }] = await sql`SELECT COUNT(*)::int FROM landscape.tbl_project WHERE project_id = ${projectId}`
  if (!projectExists) {
    console.error(`❌ Project ${projectId} not found.`)
    process.exit(1)
  }

  console.log(`⛏️  Bootstrapping containers for project ${projectId}`)

  const areas = await sql`
    SELECT area_id, area_no
    FROM landscape.tbl_area
    WHERE project_id = ${projectId}
    ORDER BY area_no
  `

  const areaIdToContainerId = new Map()
  for (const area of areas) {
    const code = `AREA-${area.area_no}`
    const display = `Plan Area ${area.area_no}`
    const attrs = { area_id: area.area_id, area_no: area.area_no }
    const rows = await sql`
      INSERT INTO landscape.tbl_container (
        project_id, parent_container_id, container_level, container_code, display_name, sort_order, attributes
      ) VALUES (
        ${projectId}, NULL, 1, ${code}, ${display}, ${area.area_no}, ${attrs}
      )
      ON CONFLICT (project_id, container_code) DO UPDATE
      SET display_name = EXCLUDED.display_name,
          sort_order = EXCLUDED.sort_order,
          attributes = EXCLUDED.attributes
      RETURNING container_id
    `
    areaIdToContainerId.set(area.area_id, rows[0].container_id)
  }

  const phases = await sql`
    SELECT ph.phase_id, ph.phase_no, ph.area_id, ar.area_no
    FROM landscape.tbl_phase ph
    JOIN landscape.tbl_area ar ON ar.area_id = ph.area_id
    WHERE ph.project_id = ${projectId}
    ORDER BY ar.area_no, ph.phase_no
  `

  const phaseIdToContainerId = new Map()
  for (const phase of phases) {
    const parentId = areaIdToContainerId.get(phase.area_id)
    if (!parentId) continue
    const code = `PHASE-${phase.area_no}-${phase.phase_no}`
    const display = `Phase ${phase.area_no}.${phase.phase_no}`
    const attrs = { phase_id: phase.phase_id, phase_no: phase.phase_no, area_id: phase.area_id }
    const rows = await sql`
      INSERT INTO landscape.tbl_container (
        project_id, parent_container_id, container_level, container_code, display_name, sort_order, attributes
      ) VALUES (
        ${projectId}, ${parentId}, 2, ${code}, ${display}, ${phase.phase_no}, ${attrs}
      )
      ON CONFLICT (project_id, container_code) DO UPDATE
      SET parent_container_id = EXCLUDED.parent_container_id,
          display_name = EXCLUDED.display_name,
          sort_order = EXCLUDED.sort_order,
          attributes = EXCLUDED.attributes
      RETURNING container_id
    `
    phaseIdToContainerId.set(phase.phase_id, rows[0].container_id)
  }

  const parcels = await sql`
    SELECT parcel_id, area_id, phase_id, lot_product, landuse_code, units_total, acres_gross
    FROM landscape.tbl_parcel
    WHERE project_id = ${projectId}
    ORDER BY parcel_id
  `

  for (const parcel of parcels) {
    const parentId = phaseIdToContainerId.get(parcel.phase_id) || areaIdToContainerId.get(parcel.area_id)
    if (!parentId) continue
    const code = `PARCEL-${parcel.parcel_id}`
    const display = `Parcel ${parcel.parcel_id}`
    const attrs = {
      parcel_id: parcel.parcel_id,
      phase_id: parcel.phase_id,
      area_id: parcel.area_id,
      lot_product: parcel.lot_product,
      landuse_code: parcel.landuse_code,
      units: parcel.units_total,
      acres: parcel.acres_gross
    }
    await sql`
      INSERT INTO landscape.tbl_container (
        project_id, parent_container_id, container_level, container_code, display_name, sort_order, attributes
      ) VALUES (
        ${projectId}, ${parentId}, 3, ${code}, ${display}, ${parcel.parcel_id}, ${attrs}
      )
      ON CONFLICT (project_id, container_code) DO UPDATE
      SET parent_container_id = EXCLUDED.parent_container_id,
          display_name = EXCLUDED.display_name,
          sort_order = EXCLUDED.sort_order,
          attributes = EXCLUDED.attributes
    `
  }

  console.log('✅ Container hierarchy bootstrapped.')
}

main().catch((error) => {
  console.error('❌ Failed to bootstrap containers:', error)
  process.exit(1)
})
