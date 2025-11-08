import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { UnitCostTemplateSummary } from '@/types/benchmarks';

const DJANGO_API_URL = process.env.DJANGO_API_URL;

async function fetchTemplatesViaDjango(stage: string, projectTypeCode: string | null, search: string | null) {
  if (!DJANGO_API_URL) return null;

  const url = new URL(`${DJANGO_API_URL.replace(/\/$/, '')}/api/financial/unit-costs/templates/by-stage/`);
  url.searchParams.set('stage', stage);
  if (projectTypeCode) {
    url.searchParams.set('project_type_code', projectTypeCode);
  }
  if (search) {
    url.searchParams.set('search', search);
  }

  try {
    const response = await fetch(url.toString(), {
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      console.error('Failed to fetch templates by stage from Django:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn('Django templates-by-stage endpoint unreachable:', error);
    return null;
  }
}

async function fetchTemplatesDirect(
  stage: string,
  projectTypeCode: string | null,
  search: string | null
): Promise<UnitCostTemplateSummary[]> {
  let result;

  if (projectTypeCode && search) {
    result = await sql`
      SELECT
        t.template_id,
        t.category_id,
        c.category_name,
        t.item_name,
        t.default_uom_code,
        t.quantity,
        t.typical_mid_value,
        t.market_geography,
        t.source,
        t.as_of_date,
        t.project_type_code,
        t.usage_count,
        t.last_used_date,
        t.created_from_ai,
        t.created_from_project_id,
        t.is_active,
        EXISTS(
          SELECT 1 FROM landscape.core_template_benchmark_link l
          WHERE l.template_id = t.template_id
        ) as has_benchmarks
      FROM landscape.core_unit_cost_template t
      INNER JOIN landscape.core_unit_cost_category c ON c.category_id = t.category_id
      WHERE t.is_active = true
        AND c.is_active = true
        AND c.development_stage = ${stage}
        AND UPPER(t.project_type_code) = UPPER(${projectTypeCode})
        AND t.item_name ILIKE ${`%${search}%`}
      ORDER BY t.item_name
    `;
  } else if (projectTypeCode) {
    result = await sql`
      SELECT
        t.template_id,
        t.category_id,
        c.category_name,
        t.item_name,
        t.default_uom_code,
        t.quantity,
        t.typical_mid_value,
        t.market_geography,
        t.source,
        t.as_of_date,
        t.project_type_code,
        t.usage_count,
        t.last_used_date,
        t.created_from_ai,
        t.created_from_project_id,
        t.is_active,
        EXISTS(
          SELECT 1 FROM landscape.core_template_benchmark_link l
          WHERE l.template_id = t.template_id
        ) as has_benchmarks
      FROM landscape.core_unit_cost_template t
      INNER JOIN landscape.core_unit_cost_category c ON c.category_id = t.category_id
      WHERE t.is_active = true
        AND c.is_active = true
        AND c.development_stage = ${stage}
        AND UPPER(t.project_type_code) = UPPER(${projectTypeCode})
      ORDER BY t.item_name
    `;
  } else if (search) {
    result = await sql`
      SELECT
        t.template_id,
        t.category_id,
        c.category_name,
        t.item_name,
        t.default_uom_code,
        t.quantity,
        t.typical_mid_value,
        t.market_geography,
        t.source,
        t.as_of_date,
        t.project_type_code,
        t.usage_count,
        t.last_used_date,
        t.created_from_ai,
        t.created_from_project_id,
        t.is_active,
        EXISTS(
          SELECT 1 FROM landscape.core_template_benchmark_link l
          WHERE l.template_id = t.template_id
        ) as has_benchmarks
      FROM landscape.core_unit_cost_template t
      INNER JOIN landscape.core_unit_cost_category c ON c.category_id = t.category_id
      WHERE t.is_active = true
        AND c.is_active = true
        AND c.development_stage = ${stage}
        AND t.item_name ILIKE ${`%${search}%`}
      ORDER BY t.item_name
    `;
  } else {
    result = await sql`
      SELECT
        t.template_id,
        t.category_id,
        c.category_name,
        t.item_name,
        t.default_uom_code,
        t.quantity,
        t.typical_mid_value,
        t.market_geography,
        t.source,
        t.as_of_date,
        t.project_type_code,
        t.usage_count,
        t.last_used_date,
        t.created_from_ai,
        t.created_from_project_id,
        t.is_active,
        EXISTS(
          SELECT 1 FROM landscape.core_template_benchmark_link l
          WHERE l.template_id = t.template_id
        ) as has_benchmarks
      FROM landscape.core_unit_cost_template t
      INNER JOIN landscape.core_unit_cost_category c ON c.category_id = t.category_id
      WHERE t.is_active = true
        AND c.is_active = true
        AND c.development_stage = ${stage}
      ORDER BY t.item_name
    `;
  }

  return result.map((row: any) => ({
    template_id: row.template_id,
    category_id: row.category_id,
    category_name: row.category_name,
    item_name: row.item_name,
    default_uom_code: row.default_uom_code,
    quantity: row.quantity,
    typical_mid_value: row.typical_mid_value,
    market_geography: row.market_geography,
    source: row.source,
    as_of_date: row.as_of_date,
    project_type_code: row.project_type_code,
    usage_count: row.usage_count || 0,
    last_used_date: row.last_used_date,
    has_benchmarks: row.has_benchmarks || false,
    created_from_ai: row.created_from_ai || false,
    created_from_project_id: row.created_from_project_id,
    is_active: row.is_active
  }));
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const stage = searchParams.get('stage');
  const projectTypeCode = searchParams.get('project_type_code');
  const search = searchParams.get('search');

  if (!stage) {
    return NextResponse.json(
      { error: 'stage parameter required' },
      { status: 400 }
    );
  }

  try {
    // Try Django first
    const djangoData = await fetchTemplatesViaDjango(stage, projectTypeCode, search);
    if (djangoData) {
      return NextResponse.json(djangoData);
    }

    // Fallback to direct SQL
    const directData = await fetchTemplatesDirect(stage, projectTypeCode, search);
    return NextResponse.json(directData);
  } catch (error) {
    console.error('Error fetching templates by stage:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
