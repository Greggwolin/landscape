import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type Params = { params: Promise<{ projectId: string }> };

function parseBoolean(value: string | null, defaultValue: boolean): boolean {
  if (value === null) return defaultValue;
  return ['true', '1', 'yes'].includes(value.toLowerCase());
}

function toDateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 10);
}

function differenceInDays(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

export async function GET(request: NextRequest, context: Params) {
  try {
    const { projectId: projId } = await context.params;
    const projectId = Number(projId);
    if (!Number.isFinite(projectId) || projectId <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid projectId' },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const startDateParam = searchParams.get('startDate') || null;
    const endDateParam = searchParams.get('endDate') || null;
    const includeCompleted = parseBoolean(searchParams.get('includeCompleted'), true);
    const criticalOnly = parseBoolean(searchParams.get('criticalOnly'), false);
    const statusFilter = searchParams.get('status') || null;

    if (startDateParam && endDateParam) {
      const start = new Date(startDateParam);
      const end = new Date(endDateParam);
      if (start > end) {
        return NextResponse.json(
          { success: false, error: 'startDate must be on or before endDate' },
          { status: 400 }
        );
      }
    }

    const projectRows = await sql<{
      projectId: number;
      projectName: string;
      analysisStartDate: string | null;
      analysisEndDate: string | null;
    }>`
      SELECT
        project_id AS "projectId",
        project_name AS "projectName",
        analysis_start_date::text AS "analysisStartDate",
        analysis_end_date::text AS "analysisEndDate"
      FROM landscape.tbl_project
      WHERE project_id = ${projectId}
      LIMIT 1
    `;

    const project = projectRows[0];
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    const items = await sql<{
      id: string;
      type: string;
      item_id: number;
      name: string | null;
      status: string | null;
      is_critical: boolean | null;
      baseline_start: string | null;
      baseline_end: string | null;
      current_start: string | null;
      current_end: string | null;
      actual_start_date: string | null;
      actual_end_date: string | null;
      percent_complete: string | number | null;
      float_days: number | null;
      amount: string | number | null;
      timing_method: string | null;
      created_at: string | null;
      predecessor_count: number;
      successor_count: number;
    }>`
      WITH budget_items AS (
        SELECT 
          'budget-' || fb.fact_id AS id,
          'budget' AS type,
          fb.fact_id AS item_id,
          COALESCE(fb.detail, CONCAT('Budget Item ', fb.fact_id)) AS name,
          fb.status,
          fb.is_critical,
          fb.baseline_start_date AS baseline_start,
          fb.baseline_end_date AS baseline_end,
          fb.start_date AS current_start,
          fb.end_date AS current_end,
          fb.actual_start_date,
          fb.actual_end_date,
          fb.percent_complete,
          fb.float_days,
          fb.amount,
          fb.timing_method,
          fb.created_at
        FROM landscape.core_fin_fact_budget fb
        WHERE fb.project_id = ${projectId}
          AND (${startDateParam ?? null} IS NULL OR fb.start_date >= ${startDateParam ?? null})
          AND (${endDateParam ?? null} IS NULL OR fb.end_date <= ${endDateParam ?? null})
          AND (${includeCompleted} OR fb.status != 'completed')
          AND (${criticalOnly} IS FALSE OR fb.is_critical = TRUE)
          AND (${statusFilter ?? null} IS NULL OR fb.status = ${statusFilter ?? null})
      ),
      milestone_items AS (
        SELECT
          'milestone-' || ms.milestone_id AS id,
          'milestone' AS type,
          ms.milestone_id AS item_id,
          ms.milestone_name AS name,
          ms.status,
          ms.is_critical,
          ms.baseline_date AS baseline_start,
          ms.baseline_date AS baseline_end,
          ms.current_date AS current_start,
          ms.current_date AS current_end,
          ms.actual_date AS actual_start_date,
          ms.actual_date AS actual_end_date,
          ms.percent_complete,
          ms.float_days,
          NULL::numeric AS amount,
          'milestone' AS timing_method,
          ms.created_at
        FROM landscape.tbl_project_milestone ms
        WHERE ms.project_id = ${projectId}
          AND (${startDateParam ?? null} IS NULL OR ms.current_date >= ${startDateParam ?? null})
          AND (${endDateParam ?? null} IS NULL OR ms.current_date <= ${endDateParam ?? null})
          AND (${includeCompleted} OR ms.status != 'completed')
          AND (${criticalOnly} IS FALSE OR ms.is_critical = TRUE)
          AND (${statusFilter ?? null} IS NULL OR ms.status = ${statusFilter ?? null})
      ),
      combined AS (
        SELECT * FROM budget_items
        UNION ALL
        SELECT * FROM milestone_items
      )
      SELECT 
        c.*,
        (
          SELECT COUNT(*)
          FROM landscape.tbl_dependency dep
          WHERE dep.successor_type = CASE WHEN c.type = 'budget' THEN 'budget' ELSE 'milestone' END
            AND dep.successor_id = c.item_id
            AND dep.is_active = TRUE
        ) AS predecessor_count,
        (
          SELECT COUNT(*)
          FROM landscape.tbl_dependency dep
          WHERE dep.predecessor_type = CASE WHEN c.type = 'budget' THEN 'budget' ELSE 'milestone' END
            AND dep.predecessor_id = c.item_id
            AND dep.is_active = TRUE
        ) AS successor_count
      FROM combined c
      ORDER BY 
        COALESCE(c.current_start, c.baseline_start, c.created_at),
        c.type DESC,
        c.name
    `;

    const transformed = items.map(row => {
      const normalizedPercent =
        row.percent_complete != null ? Number(row.percent_complete) : 0;
      const amount = row.amount != null ? Number(row.amount) : null;
      const rawDuration =
        row.current_start && row.current_end
          ? differenceInDays(row.current_start, row.current_end) ?? 0
          : 0;
      const duration = rawDuration > 0 ? rawDuration : 0;
      const varianceDays = differenceInDays(
        row.baseline_end ?? row.baseline_start,
        row.current_end ?? row.current_start
      );
      const varianceStatus =
        varianceDays == null
          ? 'on_track'
          : varianceDays > 0
          ? 'delayed'
          : varianceDays < 0
          ? 'ahead'
          : 'on_track';

      if (row.type === 'milestone') {
        return {
          id: row.id,
          type: 'milestone' as const,
          name: row.name ?? `Milestone ${row.item_id}`,
          status: row.status ?? 'not_started',
          isCritical: Boolean(row.is_critical),
          dates: {
            baseline: { date: toDateOnly(row.baseline_start) },
            current: { date: toDateOnly(row.current_start) },
            actual: { date: toDateOnly(row.actual_start_date) }
          },
          duration: 0,
          percentComplete: normalizedPercent,
          float: row.float_days ?? null,
          dependencies: {
            predecessorCount: Number(row.predecessor_count),
            successorCount: Number(row.successor_count)
          },
          variance:
            varianceDays == null
              ? null
              : {
                  days: varianceDays,
                  status: varianceStatus
                }
        };
      }

      return {
        id: row.id,
        type: 'budget' as const,
        name: row.name ?? `Budget Item ${row.item_id}`,
        status: row.status ?? 'not_started',
        isCritical: Boolean(row.is_critical),
        dates: {
          baseline: {
            start: toDateOnly(row.baseline_start),
            end: toDateOnly(row.baseline_end)
          },
          current: {
            start: toDateOnly(row.current_start),
            end: toDateOnly(row.current_end)
          },
          actual: {
            start: toDateOnly(row.actual_start_date),
            end: toDateOnly(row.actual_end_date)
          }
        },
        duration,
        percentComplete: normalizedPercent,
        float: row.float_days ?? null,
        amount,
        timingMethod: row.timing_method,
        dependencies: {
          predecessorCount: Number(row.predecessor_count),
          successorCount: Number(row.successor_count)
        },
        variance:
          varianceDays == null
            ? null
            : {
                days: varianceDays,
                status: varianceStatus
              }
      };
    });

    const budgetCount = transformed.filter(item => item.type === 'budget').length;
    const milestoneCount = transformed.length - budgetCount;
    const criticalCount = transformed.filter(item => item.isCritical).length;
    const startCandidates = transformed
      .map(item =>
        item.type === 'budget'
          ? item.dates.current.start ?? item.dates.baseline.start
          : item.dates.current.date ?? item.dates.baseline.date
      )
      .filter(Boolean) as string[];
    const endCandidates = transformed
      .map(item =>
        item.type === 'budget'
          ? item.dates.current.end ?? item.dates.baseline.end
          : item.dates.current.date ?? item.dates.baseline.date
      )
      .filter(Boolean) as string[];
    const projectStartDate =
      startCandidates.length > 0
        ? startCandidates.sort()[0]
        : project.analysisStartDate;
    const projectEndDate =
      endCandidates.length > 0
        ? endCandidates.sort()[endCandidates.length - 1]
        : project.analysisEndDate;
    let durationDays =
      projectStartDate && projectEndDate
        ? differenceInDays(projectStartDate, projectEndDate)
        : null;
    if (durationDays != null && durationDays < 0) {
      durationDays = 0;
    }

    return NextResponse.json({
      success: true,
      projectId,
      projectName: project.projectName,
      timelineStats: {
        totalItems: transformed.length,
        budgetItems: budgetCount,
        milestones: milestoneCount,
        criticalItems: criticalCount,
        projectStartDate,
        projectEndDate,
        durationDays
      },
      items: transformed
    });
  } catch (error) {
    console.error('Timeline fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch timeline' },
      { status: 500 }
    );
  }
}
