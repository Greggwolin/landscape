import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

/**
 * DEV-ONLY: Cascade-delete a project and all dependent records.
 *
 * DELETE /api/dev/cleanup-project?project_id=XXX
 *
 * Handles the 42 NO ACTION / RESTRICT FK tables manually,
 * then deletes from tbl_project (which cascades to 65 CASCADE tables).
 * Also cleans up tables with project_id columns but no FK constraints.
 */
export async function DELETE(request: NextRequest) {
  // Block in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Cleanup endpoint is disabled in production' },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const projectIdStr = searchParams.get('project_id')
  if (!projectIdStr) {
    return NextResponse.json(
      { error: 'project_id query parameter is required' },
      { status: 400 }
    )
  }

  const projectId = parseInt(projectIdStr, 10)
  if (!Number.isFinite(projectId) || projectId <= 0) {
    return NextResponse.json(
      { error: 'project_id must be a positive integer' },
      { status: 400 }
    )
  }

  // Verify the project exists
  const existing = await sql`
    SELECT project_id, project_name, created_by FROM tbl_project WHERE project_id = ${projectId}
  `
  if (existing.length === 0) {
    return NextResponse.json(
      { error: `Project ${projectId} not found` },
      { status: 404 }
    )
  }

  const projectName = existing[0].project_name
  const projectOwner: string | null = existing[0].created_by ?? null

  // Ownership check: prevent deleting another user's project
  const requestUser = getUserFromRequest(request)
  if (projectOwner !== null && requestUser) {
    // Project has an owner AND request is authenticated — enforce ownership
    if (projectOwner !== requestUser.username) {
      return NextResponse.json(
        { error: 'Project belongs to a different user' },
        { status: 403 }
      )
    }
  }
  const deletionLog: Record<string, number> = {}

  /**
   * Helper: delete from a table by project_id column.
   * Silently skips if the table doesn't exist.
   */
  async function deleteByProjectId(table: string, column = 'project_id') {
    try {
      const result = await sql.query(
        `DELETE FROM ${table} WHERE ${column} = $1`,
        [projectId]
      )
      const count = typeof result === 'object' && result !== null && 'length' in result
        ? (result as unknown[]).length
        : 0
      // Neon returns the deleted rows, so length = count
      // For DELETE without RETURNING, we track as attempted
      deletionLog[table] = count
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      // Table doesn't exist or other non-critical error
      if (msg.includes('does not exist')) {
        deletionLog[table] = -1 // signal: table not found
      } else {
        deletionLog[table] = -2 // signal: error
        deletionLog[`${table}_error`] = 0
        console.error(`[cleanup] Error deleting from ${table}:`, msg)
      }
    }
  }

  /**
   * Helper: delete from a table using a subquery join.
   */
  async function deleteBySubquery(table: string, fkColumn: string, parentTable: string, parentPk: string, parentFilter: string, parentFilterColumn = 'project_id') {
    try {
      await sql.query(
        `DELETE FROM ${table} WHERE ${fkColumn} IN (SELECT ${parentPk} FROM ${parentTable} WHERE ${parentFilter} = $1)`,
        [projectId]
      )
      deletionLog[table] = 0 // attempted
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('does not exist')) {
        deletionLog[table] = -1
      } else {
        console.error(`[cleanup] Error deleting from ${table}:`, msg)
        deletionLog[table] = -2
      }
    }
  }

  try {
    // ============================================================
    // TIER 1: Deepest leaf tables with inter-table FK dependencies
    // ============================================================

    // landscaper_advice depends on landscaper_chat_message
    await deleteByProjectId('landscaper_advice')

    // tbl_land_comp_adjustments depends on tbl_land_comparables
    await deleteBySubquery('tbl_land_comp_adjustments', 'land_comparable_id', 'tbl_land_comparables', 'id', 'project_id')

    // Multifamily children depend on tbl_multifamily_unit
    await deleteBySubquery('tbl_multifamily_lease', 'unit_id', 'tbl_multifamily_unit', 'unit_id', 'project_id')
    await deleteBySubquery('tbl_multifamily_turn', 'unit_id', 'tbl_multifamily_unit', 'unit_id', 'project_id')

    // Income property children
    await deleteBySubquery('tbl_commercial_lease', 'income_property_id', 'tbl_income_property', 'id', 'project_id')
    await deleteBySubquery('tbl_space', 'income_property_id', 'tbl_income_property', 'id', 'project_id')
    await deleteBySubquery('tbl_income_property_ind_ext', 'income_property_id', 'tbl_income_property', 'id', 'project_id')
    await deleteBySubquery('tbl_income_property_mf_ext', 'income_property_id', 'tbl_income_property', 'id', 'project_id')
    await deleteBySubquery('tbl_income_property_ret_ext', 'income_property_id', 'tbl_income_property', 'id', 'project_id')

    // IC challenge depends on tbl_ic_session
    await deleteBySubquery('tbl_ic_challenge', 'ic_session_id', 'tbl_ic_session', 'id', 'project_id')

    // Waterfall tier depends on tbl_equity_structure
    await deleteBySubquery('tbl_waterfall_tier', 'equity_structure_id', 'tbl_equity_structure', 'id', 'project_id')

    // Dynamic column values depend on tbl_dynamic_column_definition
    await deleteBySubquery('tbl_dynamic_column_value', 'column_definition_id', 'tbl_dynamic_column_definition', 'id', 'project_id')

    // Benchmark children depend on tbl_global_benchmark_registry
    await deleteBySubquery('bmk_absorption_velocity', 'benchmark_id', 'tbl_global_benchmark_registry', 'id', 'source_project_id')
    await deleteBySubquery('land_use_pricing', 'benchmark_id', 'tbl_global_benchmark_registry', 'id', 'source_project_id')
    await deleteBySubquery('core_fin_growth_rate_sets', 'benchmark_id', 'tbl_global_benchmark_registry', 'id', 'source_project_id')
    await deleteBySubquery('landscaper_absorption_detail', 'benchmark_id', 'tbl_global_benchmark_registry', 'id', 'source_project_id')
    await deleteBySubquery('tbl_benchmark_unit_cost', 'benchmark_id', 'tbl_global_benchmark_registry', 'id', 'source_project_id')
    await deleteBySubquery('tbl_benchmark_contingency', 'benchmark_id', 'tbl_global_benchmark_registry', 'id', 'source_project_id')
    await deleteBySubquery('tbl_benchmark_transaction_cost', 'benchmark_id', 'tbl_global_benchmark_registry', 'id', 'source_project_id')
    await deleteBySubquery('core_item_benchmark_link', 'benchmark_id', 'tbl_global_benchmark_registry', 'id', 'source_project_id')

    // tbl_assumption_snapshot depends on tbl_scenario_log
    await deleteBySubquery('tbl_assumption_snapshot', 'scenario_log_id', 'tbl_scenario_log', 'id', 'project_id')

    // tbl_budget depends on tbl_phase (RESTRICT)
    await deleteBySubquery('tbl_budget', 'devphase_id', 'tbl_phase', 'phase_id', 'project_id')

    // ============================================================
    // TIER 2: NO ACTION tables with direct project_id FK
    // ============================================================
    await deleteByProjectId('tbl_benchmark_ai_suggestions')
    await deleteByProjectId('ai_extraction_staging')
    await deleteByProjectId('ai_ingestion_history')
    await deleteByProjectId('ai_review_history')
    await deleteByProjectId('extraction_commit_snapshot')
    await deleteByProjectId('core_doc_media')
    await deleteByProjectId('core_doc')
    await deleteByProjectId('core_unit_cost_item', 'created_from_project_id')
    await deleteByProjectId('dms_assertion')
    await deleteByProjectId('dms_templates')
    await deleteByProjectId('dms_unmapped')
    await deleteByProjectId('gis_boundary_history')
    await deleteByProjectId('gis_mapping_history')
    await deleteByProjectId('landscaper_chat_message')
    await deleteByProjectId('project_parcel_boundaries')
    await deleteByProjectId('project_boundaries')
    await deleteByProjectId('project_jurisdiction_mapping')
    await deleteByProjectId('tbl_acquisition')
    await deleteByProjectId('tbl_budget_items')
    await deleteByProjectId('tbl_capex_reserve')
    await deleteByProjectId('tbl_capital_call')
    await deleteByProjectId('tbl_cost_approach_depreciation')
    await deleteByProjectId('tbl_dynamic_column_definition')
    await deleteByProjectId('tbl_equity_structure')
    await deleteByProjectId('tbl_expense_detail')
    await deleteByProjectId('tbl_global_benchmark_registry', 'source_project_id')
    await deleteByProjectId('tbl_ic_session')
    await deleteByProjectId('tbl_income_property')
    await deleteByProjectId('tbl_land_comparables')
    await deleteByProjectId('tbl_lot')
    await deleteByProjectId('tbl_multifamily_unit')
    await deleteByProjectId('tbl_multifamily_unit_type')
    await deleteByProjectId('tbl_participation_payment')
    await deleteByProjectId('tbl_property_acquisition')
    await deleteByProjectId('tbl_rent_roll_unit')
    await deleteByProjectId('tbl_revenue_other')
    await deleteByProjectId('tbl_revenue_rent')
    await deleteByProjectId('tbl_sale_settlement')
    await deleteByProjectId('tbl_scenario_log')
    await deleteByProjectId('tbl_vacancy_assumption')
    await deleteByProjectId('tbl_value_add_assumptions')

    // RESTRICT table
    await deleteByProjectId('tbl_area')

    // ============================================================
    // TIER 3: Tables with project_id but NO FK constraint
    // ============================================================
    await deleteByProjectId('tbl_parcel')
    await deleteByProjectId('tbl_phase')
    await deleteByProjectId('tbl_container')
    await deleteByProjectId('landscaper_chat_embedding')
    await deleteByProjectId('knowledge_sessions')
    await deleteByProjectId('mutation_audit_log')
    await deleteByProjectId('doc_processing_queue')
    await deleteByProjectId('dms_project_doc_types')
    await deleteByProjectId('market_assumptions')
    await deleteByProjectId('planning_doc')
    await deleteByProjectId('tbl_extraction_job')
    await deleteByProjectId('tbl_extraction_log')
    await deleteByProjectId('tbl_narrative_version')
    await deleteByProjectId('tbl_alpha_feedback')
    await deleteByProjectId('tester_feedback')

    // ============================================================
    // TIER 4: Delete the project itself
    // (triggers CASCADE for 65 ON DELETE CASCADE tables)
    // ============================================================
    await deleteByProjectId('tbl_project', 'project_id')

    return NextResponse.json({
      success: true,
      project_id: projectId,
      project_name: projectName,
      tables_processed: deletionLog,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[cleanup] Fatal error:', msg)
    return NextResponse.json(
      {
        error: 'Cleanup failed',
        detail: msg,
        partial_results: deletionLog,
      },
      { status: 500 }
    )
  }
}
