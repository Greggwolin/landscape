import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getFallbackUnitCostData } from '@/lib/unitCostFallback';
import { updateCategoryMapping } from '@/lib/unitCostCache';

const DJANGO_API_URL = process.env.DJANGO_API_URL;

type CategoryRow = {
  category_id: number;
  category_name: string;
  cost_scope: string;
  cost_type: string;
  sort_order: number;
  template_count: number;
};

async function fetchCategoriesViaDjango(searchParams: URLSearchParams) {
  if (!DJANGO_API_URL) return null;

  const url = new URL(`${DJANGO_API_URL.replace(/\/$/, '')}/api/financial/unit-costs/categories/`);
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
      console.error('Failed to fetch unit cost categories from Django:', response.status, text);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn('Django unit cost category endpoint unreachable, falling back to direct SQL:', error);
    return null;
  }
}

async function fetchCategoriesDirect(searchParams: URLSearchParams): Promise<CategoryRow[]> {
  const costScope = searchParams.get('cost_scope') ?? null;
  const costType = searchParams.get('cost_type') ?? null;
  const projectTypeCode = searchParams.get('project_type_code') ?? null;

  const whereParts: string[] = ['c.is_active = true'];
  const values: Array<string | null> = [];

  if (costScope) {
    values.push(costScope);
    whereParts.push(`c.cost_scope = $${values.length}`);
  }

  if (costType) {
    values.push(costType);
    whereParts.push(`c.cost_type = $${values.length}`);
  }

  let templateCountExpr = 'COUNT(*) FILTER (WHERE t.is_active = true';
  if (projectTypeCode) {
    values.push(projectTypeCode);
    const idx = values.length;
    templateCountExpr += ` AND LOWER(t.project_type_code) = LOWER($${idx})`;
  }
  templateCountExpr += ')';

  const query = `
    SELECT
      c.category_id,
      c.category_name,
      c.cost_scope,
      c.cost_type,
      c.sort_order,
      ${templateCountExpr} AS template_count
    FROM landscape.core_unit_cost_category c
    LEFT JOIN landscape.core_unit_cost_template t
      ON t.category_id = c.category_id
    WHERE ${whereParts.join(' AND ')}
    GROUP BY c.category_id, c.category_name, c.cost_scope, c.cost_type, c.sort_order
    ORDER BY c.sort_order, c.category_name;
  `;

  const result = await sql.query<CategoryRow>(query, values);
  // Neon serverless returns rows directly, not as result.rows
  return result;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const normalizeCategory = (entry: any, index: number): CategoryRow | null => {
    if (!entry || typeof entry !== 'object') return null;
    const categoryIdRaw =
      entry.category_id ?? entry.id ?? entry.categoryId ?? entry.categoryID ?? null;
    const categoryId = Number(categoryIdRaw);
    const categoryName =
      entry.category_name ?? entry.name ?? entry.categoryName ?? entry.label ?? '';
    if (!categoryId || !categoryName) return null;
    const costScope = entry.cost_scope ?? 'development';
    const costType = entry.cost_type ?? entry.type ?? 'hard';
    const sortOrder = Number.isFinite(Number(entry.sort_order))
      ? Number(entry.sort_order)
      : index;
    const templateCount = Number.isFinite(Number(entry.template_count ?? entry.count))
      ? Number(entry.template_count ?? entry.count)
      : 0;

    return {
      category_id: categoryId,
      category_name: categoryName,
      cost_scope: costScope,
      cost_type: costType,
      sort_order: sortOrder,
      template_count: templateCount
    };
  };

  const extractCategories = (payload: unknown): CategoryRow[] => {
    const sources: unknown[] = [];
    if (Array.isArray(payload)) {
      sources.push(payload);
    } else if (payload && typeof payload === 'object') {
      const obj = payload as Record<string, unknown>;
      if (Array.isArray(obj.categories)) sources.push(obj.categories);
      if (Array.isArray(obj.results)) sources.push(obj.results);
      if (Array.isArray(obj.data)) sources.push(obj.data);
    }
    if (sources.length === 0) return [];

    const items: CategoryRow[] = [];
    sources.forEach((source) => {
      if (!Array.isArray(source)) return;
      source.forEach((entry, index) => {
        const normalized = normalizeCategory(entry, index);
        if (normalized) items.push(normalized);
      });
    });

    return items;
  };

  const djangoPayload = await fetchCategoriesViaDjango(searchParams);
  if (djangoPayload) {
    const categories = extractCategories(djangoPayload);
    if (categories.length > 0) {
      updateCategoryMapping(categories);
      return NextResponse.json({ categories });
    }
  }

  try {
    const rows = await fetchCategoriesDirect(searchParams);
    if (rows.length > 0) {
      updateCategoryMapping(rows);
      return NextResponse.json({ categories: rows });
    }
  } catch (error) {
    console.error('Direct SQL error fetching unit cost categories:', error);
  }

  const fallback = await getFallbackUnitCostData();
  updateCategoryMapping(fallback.categories);
  return NextResponse.json({ categories: fallback.categories });
}
