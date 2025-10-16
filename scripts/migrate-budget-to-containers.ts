#!/usr/bin/env ts-node
/**
 * Migrate Budget Facts from pe_level/pe_id to container_id
 *
 * Purpose: Populate container_id in core_fin_fact_budget based on
 *          existing pe_level (project/area/phase/parcel/lot) and pe_id
 *
 * Usage:
 *   # Dry run (preview only)
 *   npx ts-node scripts/migrate-budget-to-containers.ts --dry-run
 *
 *   # Execute migration
 *   npx ts-node scripts/migrate-budget-to-containers.ts --execute
 *
 *   # Specific project only
 *   npx ts-node scripts/migrate-budget-to-containers.ts --execute --project-id=7
 *
 * Author: Claude Code Assistant
 * Date: 2025-10-15
 */

import { sql } from '@/lib/db'

interface MigrationResult {
  fact_id: number
  pe_level: string
  pe_id: string
  old_container_id: number | null
  new_container_id: number | null
  change_type: 'WILL_POPULATE' | 'WILL_CLEAR' | 'WILL_UPDATE' | 'NO_CHANGE'
}

interface MigrationSummary {
  pe_level: string
  total_facts: number
  had_container_id: number
  will_have_container_id: number
  will_change: number
}

interface ValidationError {
  pe_level: string
  pe_id: string
  orphaned_count: number
}

class BudgetContainerMigration {
  private dryRun: boolean = true
  private projectId: number | null = null

  constructor(options: { dryRun?: boolean; projectId?: number } = {}) {
    this.dryRun = options.dryRun ?? true
    this.projectId = options.projectId ?? null
  }

  /**
   * Step 1: Analyze current state
   */
  async analyzeCurrentState(): Promise<void> {
    console.log('\n' + '='.repeat(60))
    console.log('STEP 1: Current State Analysis')
    console.log('='.repeat(60) + '\n')

    const results = await sql`
      SELECT
        pe_level,
        COUNT(*)::int as total_facts,
        COUNT(container_id)::int as has_container_id,
        COUNT(*) FILTER (WHERE container_id IS NULL)::int as null_container_id,
        ARRAY_AGG(DISTINCT pe_id ORDER BY pe_id) as pe_ids
      FROM landscape.core_fin_fact_budget
      GROUP BY pe_level
      ORDER BY pe_level
    `

    console.log('Current Budget Facts by pe_level:')
    console.table(results.rows)
  }

  /**
   * Step 2: Validate mapping logic
   */
  async validateMapping(): Promise<void> {
    console.log('\n' + '='.repeat(60))
    console.log('STEP 2: Validate Container Mapping')
    console.log('='.repeat(60) + '\n')

    const results = await sql<
      {
        pe_level: string
        total_items: number
        will_map: number
        will_be_null: number
        sample_mappings: string
      }[]
    >`
      WITH mapping_test AS (
        -- PROJECT level: No container at project level
        SELECT
          'project' as pe_level,
          pe_id,
          NULL::bigint as expected_container_id
        FROM landscape.core_fin_fact_budget
        WHERE pe_level = 'project'

        UNION ALL

        -- AREA level: Map via area_id
        SELECT
          'area' as pe_level,
          b.pe_id,
          c.container_id as expected_container_id
        FROM landscape.core_fin_fact_budget b
        LEFT JOIN landscape.tbl_container c
          ON c.container_level = 1
          AND c.attributes->>'area_id' = b.pe_id
        WHERE b.pe_level = 'area'

        UNION ALL

        -- PHASE level: Map via phase_id
        SELECT
          'phase' as pe_level,
          b.pe_id,
          c.container_id as expected_container_id
        FROM landscape.core_fin_fact_budget b
        LEFT JOIN landscape.tbl_container c
          ON c.container_level = 2
          AND c.attributes->>'phase_id' = b.pe_id
        WHERE b.pe_level = 'phase'

        UNION ALL

        -- PARCEL level: Map via parcel_id
        SELECT
          'parcel' as pe_level,
          b.pe_id,
          c.container_id as expected_container_id
        FROM landscape.core_fin_fact_budget b
        LEFT JOIN landscape.tbl_container c
          ON c.container_level = 3
          AND c.attributes->>'parcel_id' = b.pe_id
        WHERE b.pe_level = 'parcel'

        UNION ALL

        -- LOT level: Map via parcel_id (lots stored as parcels)
        SELECT
          'lot' as pe_level,
          b.pe_id,
          c.container_id as expected_container_id
        FROM landscape.core_fin_fact_budget b
        LEFT JOIN landscape.tbl_container c
          ON c.container_level = 3
          AND c.attributes->>'parcel_id' = b.pe_id
        WHERE b.pe_level = 'lot'
      )
      SELECT
        pe_level,
        COUNT(*)::int as total_items,
        COUNT(expected_container_id)::int as will_map,
        COUNT(*) FILTER (WHERE expected_container_id IS NULL)::int as will_be_null,
        STRING_AGG(
          DISTINCT pe_id || '→' || COALESCE(expected_container_id::text, 'NULL'),
          ', '
        ) as sample_mappings
      FROM mapping_test
      GROUP BY pe_level
      ORDER BY pe_level
    `

    console.log('Mapping Validation:')
    console.table(results)
  }

  /**
   * Step 3: Preview migration changes
   */
  async previewMigration(): Promise<{
    summary: MigrationSummary[]
    changes: MigrationResult[]
  }> {
    console.log('\n' + '='.repeat(60))
    console.log('STEP 3: Migration Preview')
    console.log('='.repeat(60) + '\n')

    // Create preview table
    await sql`
      CREATE TEMP TABLE IF NOT EXISTS migration_preview AS
      SELECT
        b.fact_id,
        b.pe_level,
        b.pe_id,
        b.container_id as old_container_id,
        CASE
          -- PROJECT: No container at project level
          WHEN b.pe_level = 'project' THEN NULL

          -- AREA: Map to Level 1 container
          WHEN b.pe_level = 'area' THEN (
            SELECT c.container_id
            FROM landscape.tbl_container c
            WHERE c.container_level = 1
              AND c.attributes->>'area_id' = b.pe_id
            LIMIT 1
          )

          -- PHASE: Map to Level 2 container
          WHEN b.pe_level = 'phase' THEN (
            SELECT c.container_id
            FROM landscape.tbl_container c
            WHERE c.container_level = 2
              AND c.attributes->>'phase_id' = b.pe_id
            LIMIT 1
          )

          -- PARCEL: Map to Level 3 container
          WHEN b.pe_level = 'parcel' THEN (
            SELECT c.container_id
            FROM landscape.tbl_container c
            WHERE c.container_level = 3
              AND c.attributes->>'parcel_id' = b.pe_id
            LIMIT 1
          )

          -- LOT: Map to Level 3 container
          WHEN b.pe_level = 'lot' THEN (
            SELECT c.container_id
            FROM landscape.tbl_container c
            WHERE c.container_level = 3
              AND c.attributes->>'parcel_id' = b.pe_id
            LIMIT 1
          )

          ELSE NULL
        END as new_container_id
      FROM landscape.core_fin_fact_budget b
    `

    // Get summary
    const summary = await sql<MigrationSummary[]>`
      SELECT
        pe_level,
        COUNT(*)::int as total_facts,
        COUNT(old_container_id)::int as had_container_id,
        COUNT(new_container_id)::int as will_have_container_id,
        COUNT(*) FILTER (WHERE old_container_id IS DISTINCT FROM new_container_id)::int as will_change
      FROM migration_preview
      GROUP BY pe_level
      ORDER BY pe_level
    `

    console.log('Migration Summary:')
    console.table(summary)

    // Get detailed changes
    const changes = await sql<MigrationResult[]>`
      SELECT
        fact_id,
        pe_level,
        pe_id,
        old_container_id,
        new_container_id,
        CASE
          WHEN old_container_id IS NULL AND new_container_id IS NOT NULL THEN 'WILL_POPULATE'
          WHEN old_container_id IS NOT NULL AND new_container_id IS NULL THEN 'WILL_CLEAR'
          WHEN old_container_id IS DISTINCT FROM new_container_id THEN 'WILL_UPDATE'
          ELSE 'NO_CHANGE'
        END as change_type
      FROM migration_preview
      WHERE old_container_id IS DISTINCT FROM new_container_id
      ORDER BY pe_level, pe_id::int
      LIMIT 50
    `

    if (changes.length > 0) {
      console.log(`\nDetailed Changes (showing first 50 of ${changes.length}):`)
      console.table(changes.slice(0, 20))
    } else {
      console.log('\nNo changes detected - all facts already have correct container_id')
    }

    return { summary, changes }
  }

  /**
   * Step 4: Execute migration
   */
  async executeMigration(): Promise<void> {
    console.log('\n' + '='.repeat(60))
    console.log('STEP 4: Execute Migration')
    console.log('='.repeat(60) + '\n')

    if (this.dryRun) {
      console.log('⚠️  DRY RUN MODE - No changes will be made')
      console.log('   Use --execute flag to perform actual migration\n')
      return
    }

    console.log('⚡ EXECUTING MIGRATION - This will modify the database!\n')

    // Begin transaction
    await sql.begin(async (tx) => {
      // Update PROJECT level (remains NULL)
      const projectResult = await tx`
        UPDATE landscape.core_fin_fact_budget
        SET container_id = NULL
        WHERE pe_level = 'project'
      `
      console.log(`✓ Updated ${projectResult.count} PROJECT level facts to container_id=NULL`)

      // Update AREA level
      const areaResult = await tx`
        UPDATE landscape.core_fin_fact_budget b
        SET container_id = c.container_id
        FROM landscape.tbl_container c
        WHERE b.pe_level = 'area'
          AND c.container_level = 1
          AND c.attributes->>'area_id' = b.pe_id
      `
      console.log(`✓ Updated ${areaResult.count} AREA level facts`)

      // Update PHASE level
      const phaseResult = await tx`
        UPDATE landscape.core_fin_fact_budget b
        SET container_id = c.container_id
        FROM landscape.tbl_container c
        WHERE b.pe_level = 'phase'
          AND c.container_level = 2
          AND c.attributes->>'phase_id' = b.pe_id
      `
      console.log(`✓ Updated ${phaseResult.count} PHASE level facts`)

      // Update PARCEL level
      const parcelResult = await tx`
        UPDATE landscape.core_fin_fact_budget b
        SET container_id = c.container_id
        FROM landscape.tbl_container c
        WHERE b.pe_level = 'parcel'
          AND c.container_level = 3
          AND c.attributes->>'parcel_id' = b.pe_id
      `
      console.log(`✓ Updated ${parcelResult.count} PARCEL level facts`)

      // Update LOT level
      const lotResult = await tx`
        UPDATE landscape.core_fin_fact_budget b
        SET container_id = c.container_id
        FROM landscape.tbl_container c
        WHERE b.pe_level = 'lot'
          AND c.container_level = 3
          AND c.attributes->>'parcel_id' = b.pe_id
      `
      console.log(`✓ Updated ${lotResult.count} LOT level facts`)

      const totalUpdated =
        projectResult.count +
        areaResult.count +
        phaseResult.count +
        parcelResult.count +
        lotResult.count

      console.log(`\n✅ Migration complete: ${totalUpdated} total facts updated`)
    })
  }

  /**
   * Step 5: Validate results
   */
  async validateResults(): Promise<void> {
    console.log('\n' + '='.repeat(60))
    console.log('STEP 5: Post-Migration Validation')
    console.log('='.repeat(60) + '\n')

    // Check final state
    const finalState = await sql<
      {
        pe_level: string
        total_facts: number
        has_container_id: number
        null_container_id: number
        pct_populated: number
      }[]
    >`
      SELECT
        pe_level,
        COUNT(*)::int as total_facts,
        COUNT(container_id)::int as has_container_id,
        COUNT(*) FILTER (WHERE container_id IS NULL)::int as null_container_id,
        ROUND(100.0 * COUNT(container_id) / COUNT(*), 2) as pct_populated
      FROM landscape.core_fin_fact_budget
      GROUP BY pe_level
      ORDER BY pe_level
    `

    console.log('Final State:')
    console.table(finalState)

    // Check for orphaned facts (should have container but don't)
    const orphaned = await sql<ValidationError[]>`
      SELECT
        pe_level,
        pe_id,
        COUNT(*)::int as orphaned_count
      FROM landscape.core_fin_fact_budget
      WHERE pe_level != 'project'
        AND container_id IS NULL
      GROUP BY pe_level, pe_id
      ORDER BY pe_level, pe_id
    `

    if (orphaned.length > 0) {
      console.log('\n❌ ORPHANED FACTS FOUND (should have container but missing):')
      console.table(orphaned)
      throw new Error('Validation failed: Orphaned facts found')
    } else {
      console.log('\n✅ Validation passed: No orphaned facts')
    }

    // Show sample mappings
    const samples = await sql<
      {
        fact_id: number
        pe_level: string
        pe_id: string
        container_id: number | null
        container_code: string | null
        display_name: string | null
      }[]
    >`
      SELECT
        b.fact_id,
        b.pe_level,
        b.pe_id,
        b.container_id,
        c.container_code,
        c.display_name
      FROM landscape.core_fin_fact_budget b
      LEFT JOIN landscape.tbl_container c ON b.container_id = c.container_id
      ORDER BY b.pe_level, b.pe_id::int
      LIMIT 10
    `

    console.log('\nSample Mappings:')
    console.table(samples)
  }

  /**
   * Run complete migration workflow
   */
  async run(): Promise<void> {
    try {
      console.log('\n' + '█'.repeat(60))
      console.log('Budget → Container Migration')
      console.log('Mode:', this.dryRun ? 'DRY RUN' : 'EXECUTE')
      if (this.projectId) {
        console.log('Project:', this.projectId)
      }
      console.log('█'.repeat(60))

      await this.analyzeCurrentState()
      await this.validateMapping()
      await this.previewMigration()
      await this.executeMigration()
      await this.validateResults()

      console.log('\n' + '█'.repeat(60))
      console.log('✅ Migration workflow completed successfully')
      console.log('█'.repeat(60) + '\n')
    } catch (error) {
      console.error('\n❌ Migration failed:', error)
      throw error
    }
  }
}

// =====================================================
// CLI Entry Point
// =====================================================

async function main() {
  const args = process.argv.slice(2)
  const dryRun = !args.includes('--execute')
  const projectIdArg = args.find((arg) => arg.startsWith('--project-id='))
  const projectId = projectIdArg ? parseInt(projectIdArg.split('=')[1]) : null

  const migration = new BudgetContainerMigration({ dryRun, projectId })
  await migration.run()
}

// Run if executed directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export { BudgetContainerMigration }
