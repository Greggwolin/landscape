import { sql } from '@/lib/db';

export type TimelineItemType = 'budget' | 'milestone';

export interface BudgetItemSummary {
  type: 'budget';
  id: number;
  projectId: number;
  name: string;
  timingMethod: string | null;
  baselineStartDate: string | null;
  baselineEndDate: string | null;
}

export interface MilestoneSummary {
  type: 'milestone';
  id: number;
  projectId: number;
  name: string;
  status: string;
}

export type TimelineItemSummary = BudgetItemSummary | MilestoneSummary;

export async function getBudgetItemSummary(factId: number): Promise<BudgetItemSummary | null> {
  const rows = await sql`
    SELECT
      fb.fact_id::int AS fact_id,
      fb.project_id::int AS project_id,
      COALESCE(fc.detail, CONCAT('Budget Item #', fb.fact_id)) AS name,
      fb.timing_method,
      fb.baseline_start_date::text AS baseline_start_date,
      fb.baseline_end_date::text AS baseline_end_date
    FROM landscape.core_fin_fact_budget fb
    LEFT JOIN landscape.core_fin_category fc ON fb.category_id = fc.category_id
    WHERE fb.fact_id = ${factId}
  `;

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    type: 'budget',
    id: Number(row.fact_id),
    projectId: Number(row.project_id),
    name: row.name ?? `Budget Item #${factId}`,
    timingMethod: row.timing_method ?? null,
    baselineStartDate: row.baseline_start_date ?? null,
    baselineEndDate: row.baseline_end_date ?? null
  };
}

export async function getMilestoneSummary(milestoneId: number): Promise<MilestoneSummary | null> {
  const rows = await sql`
    SELECT
      milestone_id::int AS milestone_id,
      project_id::int AS project_id,
      milestone_name,
      status
    FROM landscape.tbl_project_milestone
    WHERE milestone_id = ${milestoneId}
  `;

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    type: 'milestone',
    id: Number(row.milestone_id),
    projectId: Number(row.project_id),
    name: row.milestone_name ?? `Milestone #${milestoneId}`,
    status: row.status ?? 'not_started'
  };
}

export async function getTimelineItemSummary(
  type: TimelineItemType,
  id: number
): Promise<TimelineItemSummary | null> {
  if (type === 'budget') {
    return getBudgetItemSummary(id);
  }
  return getMilestoneSummary(id);
}
