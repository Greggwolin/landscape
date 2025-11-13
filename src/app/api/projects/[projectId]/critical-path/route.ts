import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

function durationDays(start: string | null, finish: string | null): number {
  if (!start || !finish) return 0;
  const startDate = new Date(start);
  const finishDate = new Date(finish);
  const diff = Math.round(
    (finishDate.setHours(0, 0, 0, 0) - startDate.setHours(0, 0, 0, 0)) /
      (24 * 60 * 60 * 1000)
  );
  return Math.max(diff, 0);
}

export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = Number(params.projectId);
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Invalid projectId' },
        { status: 400 }
      );
    }

    const projectRows = await sql`
      SELECT analysis_start_date::text AS analysis_start_date,
             analysis_end_date::text AS analysis_end_date
      FROM landscape.tbl_project
      WHERE project_id = ${projectId}
    `;

    const budgetRows = await sql`
      SELECT
        'budget' AS item_type,
        fb.fact_id::int AS id,
        COALESCE(fc.detail, CONCAT('Budget Item #', fb.fact_id)) AS name,
        fb.early_start_date::text AS early_start,
        fb.early_finish_date::text AS early_finish,
        fb.float_days,
        fb.project_id
      FROM landscape.core_fin_fact_budget fb
      LEFT JOIN landscape.core_fin_category fc ON fb.category_id = fc.category_id
      WHERE fb.project_id = ${projectId}
        AND fb.is_critical = TRUE
    `;

    const milestoneRows = await sql`
      SELECT
        'milestone' AS item_type,
        milestone_id::int AS id,
        milestone_name AS name,
        early_date::text AS early_start,
        late_date::text AS early_finish,
        float_days,
        project_id
      FROM landscape.tbl_project_milestone
      WHERE project_id = ${projectId}
        AND is_critical = TRUE
    `;

    const combined = [...budgetRows, ...milestoneRows].sort((a, b) => {
      const aStart = a.early_start || '';
      const bStart = b.early_start || '';
      if (aStart === bStart) return 0;
      if (!aStart) return 1;
      if (!bStart) return -1;
      return aStart.localeCompare(bStart);
    });

    const items = combined.map((row, index) => ({
      sequence: index + 1,
      type: row.item_type,
      id: row.id,
      name: row.name,
      earlyStart: row.early_start,
      earlyFinish: row.early_finish,
      duration: durationDays(row.early_start, row.early_finish),
      float: row.float_days ?? 0
    }));

    const criticalPathLength = items.reduce((total, item) => total + item.duration, 0);

    const projectInfo = projectRows[0] || {};

    return NextResponse.json({
      success: true,
      projectId,
      criticalPathLength,
      projectStartDate: projectInfo.analysis_start_date || null,
      projectEndDate: projectInfo.analysis_end_date || null,
      items
    });
  } catch (error: any) {
    console.error('Fetch critical path error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch critical path' },
      { status: 500 }
    );
  }
}
