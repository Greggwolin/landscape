/**
 * Timeline Calculation API
 * POST /api/projects/[projectId]/timeline/calculate - Calculate and save timeline
 * GET /api/projects/[projectId]/timeline/calculate - Preview timeline (dry run)
 */

import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ projectId: string }> };

const sql = neon(process.env.DATABASE_URL!);

interface Dependency {
  dependency_id: number;
  dependent_item_id: number;
  trigger_item_id: number | null;
  trigger_event: string;
  trigger_value: number | null;
  offset_periods: number | null;
}

interface BudgetItem {
  budget_item_id: number;
  description: string;
  start_period: number | null;
  periods_to_complete: number | null;
  timing_method: string;
  timing_locked: boolean;
}

/**
 * POST /api/projects/[projectId]/timeline/calculate
 * Calculate timeline with dependency resolution
 */
export async function POST(
  request: NextRequest,
  context: Params
) {
  try {
    const {  projectId  } = await context.params;
    const body = await request.json().catch(() => ({}));
    const { dry_run = false } = body;

    // Fetch budget items for this project
    const items = await sql`
      SELECT
        bi.budget_item_id,
        bs.detail as description,
        bi.start_period,
        bi.periods_to_complete,
        bi.timing_method,
        bi.timing_locked
      FROM landscape.tbl_budget_items bi
      JOIN landscape.tbl_budget_structure bs ON bi.structure_id = bs.structure_id
      WHERE bi.project_id=${projectId}
      ORDER BY bi.budget_item_id
    `;

    // Fetch dependencies for budget items in this project
    const dependencies = await sql`
      SELECT d.*
      FROM landscape.tbl_item_dependency d
      JOIN landscape.tbl_budget_items bi
        ON d.dependent_item_table='tbl_budget_items'
        AND d.dependent_item_id=bi.budget_item_id
      WHERE bi.project_id=${projectId}
      AND d.dependent_item_type='COST'
    `;

    // Build lookup maps - convert all string IDs to numbers
    const itemMap = new Map<number, BudgetItem>();
    for (const item of items as BudgetItem[]) {
      itemMap.set(Number(item.budget_item_id), item);
    }

    const depMap = new Map<number, Dependency[]>();
    for (const dep of dependencies as Dependency[]) {
      // Convert string IDs to numbers for Map lookup
      const depId = Number(dep.dependent_item_id);
      const trigId = dep.trigger_item_id ? Number(dep.trigger_item_id) : null;
      const converted = { ...dep, dependent_item_id: depId, trigger_item_id: trigId };
      const existing = depMap.get(depId) || [];
      existing.push(converted as any);
      depMap.set(depId, existing);
    }

    // Dependency resolution
    const resolved = new Map<number, number>(); // itemId -> calculated start period
    const resolving = new Set<number>(); // Track circular dependencies
    const errors: string[] = [];

    function resolveStartPeriod(itemId: number, path: number[] = []): number {
      // Check for circular dependency
      if (resolving.has(itemId)) {
        errors.push(
          `Circular dependency detected: ${[...path, itemId].join(' → ')}`
        );
        return 0;
      }

      // Already resolved
      if (resolved.has(itemId)) {
        return resolved.get(itemId)!;
      }

      const item = itemMap.get(itemId);
      if (!item) {
        errors.push(`Item ${itemId} not found`);
        return 0;
      }

      // If timing is locked, use current start_period
      if (item.timing_locked) {
        const startPeriod = item.start_period || 0;
        resolved.set(itemId, startPeriod);
        return startPeriod;
      }

      // Get dependencies for this item
      const deps = depMap.get(itemId);

      // If no dependencies, use current start_period
      if (!deps || deps.length === 0) {
        const startPeriod = item.start_period || 0;
        resolved.set(itemId, startPeriod);
        return startPeriod;
      }

      // Mark as resolving
      resolving.add(itemId);

      let calculatedStartPeriod = 0;

      // Resolve all dependencies
      for (const dep of deps) {
        if (dep.trigger_event === 'ABSOLUTE') {
          // Absolute timing - use offset directly
          calculatedStartPeriod = Math.max(
            calculatedStartPeriod,
            dep.offset_periods || 0
          );
          continue;
        }

        // Dependency on another item
        const triggerId = dep.trigger_item_id;
        if (triggerId === null) {
          errors.push(
            `Dependency ${dep.dependency_id} has no trigger item for non-ABSOLUTE event`
          );
          continue;
        }

        // Recursively resolve trigger item
        const triggerStartPeriod = resolveStartPeriod(triggerId, [
          ...path,
          itemId,
        ]);

        const triggerItem = itemMap.get(triggerId);
        if (!triggerItem) {
          errors.push(
            `Trigger item ${triggerId} not found for dependency ${dep.dependency_id}`
          );
          continue;
        }

        let triggerPeriod = 0;

        // Calculate based on trigger event type
        if (dep.trigger_event === 'START') {
          triggerPeriod = triggerStartPeriod;
        } else if (dep.trigger_event === 'COMPLETE') {
          triggerPeriod =
            triggerStartPeriod + (triggerItem.periods_to_complete || 0);
        } else if (dep.trigger_event === 'PCT_COMPLETE') {
          const pct = (dep.trigger_value || 50) / 100;
          triggerPeriod =
            triggerStartPeriod +
            Math.floor((triggerItem.periods_to_complete || 0) * pct);
        } else {
          errors.push(
            `Unknown trigger event: ${dep.trigger_event} for dependency ${dep.dependency_id}`
          );
          continue;
        }

        // Apply offset
        const finalPeriod = triggerPeriod + (dep.offset_periods || 0);

        // Take the maximum (most restrictive)
        calculatedStartPeriod = Math.max(calculatedStartPeriod, finalPeriod);
      }

      // Done resolving
      resolving.delete(itemId);
      resolved.set(itemId, calculatedStartPeriod);

      return calculatedStartPeriod;
    }

    // Resolve all items with DEPENDENT timing
    for (const item of items as BudgetItem[]) {
      if (item.timing_method === 'DEPENDENT' && !item.timing_locked) {
        resolveStartPeriod(item.budget_item_id);
      }
    }

    // If there were errors, return them
    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dependency resolution errors',
          details: errors,
        },
        { status: 400 }
      );
    }

    // Save to database (unless dry run)
    if (!dry_run) {
      await sql`BEGIN`;
      try {
        for (const [itemId, startPeriod] of resolved.entries()) {
          await sql`
            UPDATE landscape.tbl_budget_items
            SET start_period=${startPeriod}, updated_at=NOW()
            WHERE budget_item_id=${itemId}
          `;
        }
        await sql`COMMIT`;
      } catch (error) {
        await sql`ROLLBACK`;
        throw error;
      }
    }

    // Build response
    const resolvedPeriods = Array.from(resolved.entries()).map(
      ([itemId, period]) => ({
        budget_item_id: itemId,
        calculated_start_period: period,
        item_name: itemMap.get(itemId)?.description || 'Unknown',
        current_start_period: itemMap.get(itemId)?.start_period || 0,
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        items_processed: items.length,
        dependencies_resolved: resolved.size,
        dry_run,
        resolved_periods: resolvedPeriods,
      },
      message: dry_run
        ? 'Preview calculated (not saved)'
        : 'Timeline calculated and saved successfully',
    });
  } catch (error: any) {
    console.error('Timeline calculation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to calculate timeline',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects/[projectId]/timeline/calculate
 * Preview timeline (dry run)
 */
export async function GET(
  request: NextRequest,
  context: Params
) {
  try {
    const {  projectId  } = await context.params;

    // Use the view to get dependency status with calculated start periods
    const result = await sql`
      SELECT
        d.dependency_id,
        d.dependent_item_id,
        bs_dep.detail AS dependent_item_name,
        d.trigger_item_id,
        bs_trig.detail AS trigger_item_name,
        d.trigger_event,
        d.offset_periods,
        v.calculated_start_period,
        v.trigger_completion_period,
        bs_dep.start_period AS current_start_period
      FROM landscape.vw_item_dependency_status v
      JOIN landscape.tbl_item_dependency d USING (dependency_id)
      LEFT JOIN landscape.tbl_budget_items bi_dep
        ON d.dependent_item_id = bi_dep.budget_item_id
      LEFT JOIN landscape.tbl_budget_structure bs_dep
        ON bi_dep.structure_id = bs_dep.structure_id
      LEFT JOIN landscape.tbl_budget_items bi_trig
        ON d.trigger_item_id = bi_trig.budget_item_id
      LEFT JOIN landscape.tbl_budget_structure bs_trig
        ON bi_trig.structure_id = bs_trig.structure_id
      WHERE bi_dep.project_id=${projectId}
      ORDER BY v.calculated_start_period, d.dependent_item_id
    `;

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Timeline preview (not saved - call POST to apply)',
    });
  } catch (error: any) {
    console.error('Timeline preview error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to preview timeline',
      },
      { status: 500 }
    );
  }
}
