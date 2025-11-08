import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { StageGroupedCategories, UnitCostCategoryReference } from '@/types/benchmarks';

const DJANGO_API_URL = process.env.DJANGO_API_URL;

async function fetchCategoriesViaDjango(projectTypeCode: string | null) {
  if (!DJANGO_API_URL) return null;

  const url = new URL(`${DJANGO_API_URL.replace(/\/$/, '')}/api/financial/unit-costs/categories/by-stage/`);
  if (projectTypeCode) {
    url.searchParams.set('project_type_code', projectTypeCode);
  }

  try {
    const response = await fetch(url.toString(), {
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      console.error('Failed to fetch categories by stage from Django:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn('Django categories-by-stage endpoint unreachable:', error);
    return null;
  }
}

async function fetchCategoriesDirect(projectTypeCode: string | null): Promise<StageGroupedCategories> {
  const result = projectTypeCode
    ? await sql`
        SELECT
          c.category_id,
          c.category_name,
          c.cost_scope,
          c.cost_type,
          c.development_stage,
          c.sort_order,
          COUNT(DISTINCT t.template_id) FILTER (WHERE t.is_active = true AND UPPER(t.project_type_code) = UPPER(${projectTypeCode})) as template_count
        FROM landscape.core_unit_cost_category c
        LEFT JOIN landscape.core_unit_cost_template t ON t.category_id = c.category_id
        WHERE c.is_active = true
        GROUP BY c.category_id, c.category_name, c.cost_scope, c.cost_type, c.development_stage, c.sort_order
        ORDER BY c.development_stage, c.sort_order, c.category_name
      `
    : await sql`
        SELECT
          c.category_id,
          c.category_name,
          c.cost_scope,
          c.cost_type,
          c.development_stage,
          c.sort_order,
          COUNT(DISTINCT t.template_id) FILTER (WHERE t.is_active = true) as template_count
        FROM landscape.core_unit_cost_category c
        LEFT JOIN landscape.core_unit_cost_template t ON t.category_id = c.category_id
        WHERE c.is_active = true
        GROUP BY c.category_id, c.category_name, c.cost_scope, c.cost_type, c.development_stage, c.sort_order
        ORDER BY c.development_stage, c.sort_order, c.category_name
      `;

  // Group by stage
  const grouped: StageGroupedCategories = {
    stage1_entitlements: [],
    stage2_engineering: [],
    stage3_development: []
  };

  result.forEach((row: any) => {
    const category: UnitCostCategoryReference = {
      category_id: row.category_id,
      category_name: row.category_name,
      cost_scope: row.cost_scope,
      cost_type: row.cost_type,
      development_stage: row.development_stage,
      sort_order: row.sort_order,
      template_count: parseInt(row.template_count) || 0
    };

    const stage = row.development_stage as keyof StageGroupedCategories;
    if (grouped[stage]) {
      grouped[stage].push(category);
    }
  });

  return grouped;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const projectTypeCode = searchParams.get('project_type_code');

  try {
    // Try Django first
    const djangoData = await fetchCategoriesViaDjango(projectTypeCode);
    if (djangoData) {
      return NextResponse.json(djangoData);
    }

    // Fallback to direct SQL
    const directData = await fetchCategoriesDirect(projectTypeCode);
    return NextResponse.json(directData);
  } catch (error) {
    console.error('Error fetching categories by stage:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
