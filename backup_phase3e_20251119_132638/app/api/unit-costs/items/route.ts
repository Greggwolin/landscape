import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getFallbackUnitCostData } from '@/lib/unitCostFallback';
import { getCategoryNameFromMapping } from '@/lib/unitCostCache';
import {
  mapTemplateRow,
  templateSelectFields,
  TemplateRow,
  insertTemplateDirect
} from '../templates/helpers';

const DJANGO_API_URL = process.env.DJANGO_API_URL;

async function fetchItemsViaDjango(searchParams: URLSearchParams) {
  if (!DJANGO_API_URL) return null;

  const url = new URL(`${DJANGO_API_URL.replace(/\/$/, '')}/api/unit-costs/items/`);
  searchParams.forEach((value, key) => {
    if (value !== null) {
      url.searchParams.set(key, value);
    }
  });

  try {
    const response = await fetch(url.toString(), {
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Failed to fetch unit cost items from Django:', response.status, text);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn('Django unit cost items endpoint unreachable, using direct SQL fallback:', error);
    return null;
  }
}

async function queryItems(searchParams: URLSearchParams): Promise<TemplateRow[]> {
  const includeInactive = searchParams.get('include_inactive') === 'true';
  const categoryId = searchParams.get('category_id');
  const projectTypeCode = searchParams.get('project_type_code');
  const geography = searchParams.get('geography');
  const search = searchParams.get('search');
  const limit = searchParams.get('limit');
  const offset = searchParams.get('offset');

  const whereParts: string[] = ['1=1'];
  const values: Array<string | number | null> = [];

  if (!includeInactive) {
    whereParts.push('t.is_active = true');
  }

  if (categoryId) {
    values.push(Number(categoryId));
    whereParts.push(`t.category_id = $${values.length}`);
  }

  if (projectTypeCode) {
    values.push(projectTypeCode);
    whereParts.push(`LOWER(t.project_type_code) = LOWER($${values.length})`);
  }

  if (geography) {
    values.push(`%${geography}%`);
    whereParts.push(`t.market_geography ILIKE $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    whereParts.push(`t.item_name ILIKE $${values.length}`);
  }

  const limitClause =
    limit && Number.isFinite(Number(limit)) ? ` LIMIT ${Number(limit)}` : '';
  const offsetClause =
    offset && Number.isFinite(Number(offset)) ? ` OFFSET ${Number(offset)}` : '';

  console.log('Unit cost items query params:', {
    categoryId,
    projectTypeCode,
    includeInactive
  });

  // Build query dynamically based on what params we have
  if (!categoryId) {
    const result = await sql<TemplateRow>`
      SELECT
        t.item_id as template_id,
        t.category_id,
        c.category_name,
        t.item_name,
        t.default_uom_code,
        t.typical_mid_value,
        t.quantity,
        t.market_geography,
        t.source,
        t.as_of_date,
        t.project_type_code,
        t.usage_count,
        t.last_used_date,
        t.is_active,
        t.created_from_ai,
        t.created_from_project_id,
        false AS has_benchmarks
      FROM landscape.core_unit_cost_item t
      JOIN landscape.core_unit_cost_category c ON c.category_id = t.category_id
      WHERE t.is_active = true
      ORDER BY t.item_name
      LIMIT 100
    `;
    console.log(`Query returned ${result.length} rows`);
    return result;
  }

  const categoryIdVal = Number(categoryId);

  if (projectTypeCode) {
    const result = await sql<TemplateRow>`
      SELECT
        t.item_id as template_id,
        t.category_id,
        c.category_name,
        t.item_name,
        t.default_uom_code,
        t.typical_mid_value,
        t.quantity,
        t.market_geography,
        t.source,
        t.as_of_date,
        t.project_type_code,
        t.usage_count,
        t.last_used_date,
        t.is_active,
        t.created_from_ai,
        t.created_from_project_id,
        false AS has_benchmarks
      FROM landscape.core_unit_cost_item t
      JOIN landscape.core_unit_cost_category c ON c.category_id = t.category_id
      WHERE t.is_active = true
        AND t.category_id = ${categoryIdVal}
        AND LOWER(t.project_type_code) = LOWER(${projectTypeCode})
      ORDER BY t.item_name
    `;
    console.log(`Query returned ${result.length} rows`);
    return result;
  }

  const result = await sql<TemplateRow>`
    SELECT
      t.item_id as template_id,
      t.category_id,
      c.category_name,
      t.item_name,
      t.default_uom_code,
      t.typical_mid_value,
      t.quantity,
      t.market_geography,
      t.source,
      t.as_of_date,
      t.project_type_code,
      t.usage_count,
      t.last_used_date,
      t.is_active,
      t.created_from_ai,
      t.created_from_project_id,
      false AS has_benchmarks
    FROM landscape.core_unit_cost_item t
    JOIN landscape.core_unit_cost_category c ON c.category_id = t.category_id
    WHERE t.is_active = true
      AND t.category_id = ${categoryIdVal}
    ORDER BY t.item_name
  `;

  console.log(`Query returned ${result.length} rows`);
  return result;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const djangoPayload = await fetchItemsViaDjango(searchParams);
  if (djangoPayload) {
    // Django REST framework returns {count, next, previous, results}
    const items = djangoPayload.results || djangoPayload.data || djangoPayload;
    return NextResponse.json(items);
  }

  let rows: TemplateRow[] = [];
  try {
    rows = await queryItems(searchParams);
    console.log(`Unit cost items query returned ${rows.length} rows`);
  } catch (error) {
    console.error('Direct SQL error fetching unit cost items:', error);
  }

  if (rows.length > 0) {
    return NextResponse.json(rows.map(mapTemplateRow));
  }

  console.warn('No rows returned from database, attempting fallback');
  const fallback = await getFallbackUnitCostData();
  const includeInactive = searchParams.get('include_inactive') === 'true';
  const categoryParam = searchParams.get('category_id');
  const projectTypeCode = searchParams.get('project_type_code');
  const geography = searchParams.get('geography');
  const search = searchParams.get('search');

  let templates = fallback.templates;

  if (categoryParam) {
    const categoryId = Number(categoryParam);
    if (Number.isFinite(categoryId)) {
      const categoryName = getCategoryNameFromMapping(categoryId);
      templates = templates.filter((template) =>
        categoryName
          ? template.category_name === categoryName
          : template.category_id === categoryId
      );
    }
  }

  if (projectTypeCode) {
    const normalized = projectTypeCode.trim().toUpperCase();
    templates = templates.filter(
      (template) => template.project_type_code?.toUpperCase() === normalized
    );
  }

  if (geography) {
    const target = geography.trim().toLowerCase();
    templates = templates.filter((template) =>
      template.market_geography?.toLowerCase().includes(target)
    );
  }

  if (search) {
    const target = search.trim().toLowerCase();
    templates = templates.filter((template) =>
      template.item_name.toLowerCase().includes(target)
    );
  }

  if (!includeInactive) {
    templates = templates.filter((template) => template.is_active !== false);
  }

  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  if (DJANGO_API_URL) {
    try {
      const response = await fetch(`${DJANGO_API_URL.replace(/\/$/, '')}/api/unit-costs/items/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const payload = await response.json();
        return NextResponse.json(payload, { status: 201 });
      }

      const text = await response.text();
      console.error('Failed to create unit cost item via Django:', response.status, text);
      if (response.status !== 404 && response.status !== 502) {
        return NextResponse.json(
          { error: 'Failed to create unit cost item', details: text },
          { status: response.status }
        );
      }
    } catch (error) {
      console.warn('Django unit cost item create unavailable, using direct SQL:', error);
    }
  }

  try {
    const created = await insertTemplateDirect(body as Record<string, unknown>);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Direct SQL error creating unit cost item:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unexpected error creating unit cost item'
      },
      { status: 500 }
    );
  }
}
