import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getFallbackUnitCostData } from '@/lib/unitCostFallback';
import { updateCategoryMapping } from '@/lib/unitCostCache';

const DJANGO_API_URL = process.env.DJANGO_API_URL;

type CategoryRow = {
  category_id: number;
  parent?: number;
  parent_name?: string;
  category_name: string;
  lifecycle_stages: string[];
  tags: string[];
  sort_order: number;
  is_active: boolean;
  item_count: number;
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
  const lifecycleStage = searchParams.get('lifecycle_stage') ?? searchParams.get('cost_scope') ?? null;
  const tag = searchParams.get('tag') ?? null;
  const parentId = searchParams.get('parent') ?? null;
  const projectTypeCode = searchParams.get('project_type_code') ?? null;

  let result: CategoryRow[];

  if (lifecycleStage && !tag && !parentId) {
    // Filter by lifecycle stage using junction table
    const templateCountFilter = projectTypeCode
      ? sql`AND LOWER(t.project_type_code) = LOWER(${projectTypeCode})`
      : sql``;

    result = await sql<CategoryRow>`
      SELECT
        c.category_id,
        c.parent_id as parent,
        p.category_name as parent_name,
        c.category_name,
        COALESCE(
          ARRAY_AGG(DISTINCT cls.lifecycle_stage) FILTER (WHERE cls.lifecycle_stage IS NOT NULL),
          ARRAY[]::varchar[]
        ) as lifecycle_stages,
        COALESCE(c.tags::jsonb, '[]'::jsonb) as tags,
        c.sort_order,
        c.is_active,
        CAST(COUNT(*) FILTER (WHERE t.is_active = true ${templateCountFilter}) AS INTEGER) AS item_count
      FROM landscape.core_unit_cost_category c
      INNER JOIN landscape.core_category_lifecycle_stages cls
        ON c.category_id = cls.category_id AND cls.lifecycle_stage = ${lifecycleStage}
      LEFT JOIN landscape.core_unit_cost_category p
        ON p.category_id = c.parent_id
      LEFT JOIN landscape.core_unit_cost_item t
        ON t.category_id = c.category_id
      WHERE c.is_active = true
      GROUP BY c.category_id, c.parent_id, p.category_name, c.category_name, c.tags, c.sort_order, c.is_active
      ORDER BY c.sort_order, c.category_name
    `;
  } else {
    // No filters - return all categories with their lifecycle stages
    const templateCountFilter = projectTypeCode
      ? sql`AND LOWER(t.project_type_code) = LOWER(${projectTypeCode})`
      : sql``;

    result = await sql<CategoryRow>`
      SELECT
        c.category_id,
        c.parent_id as parent,
        p.category_name as parent_name,
        c.category_name,
        COALESCE(
          ARRAY_AGG(DISTINCT cls.lifecycle_stage) FILTER (WHERE cls.lifecycle_stage IS NOT NULL),
          ARRAY[]::varchar[]
        ) as lifecycle_stages,
        COALESCE(c.tags::jsonb, '[]'::jsonb) as tags,
        c.sort_order,
        c.is_active,
        CAST(COUNT(*) FILTER (WHERE t.is_active = true ${templateCountFilter}) AS INTEGER) AS item_count
      FROM landscape.core_unit_cost_category c
      LEFT JOIN landscape.core_category_lifecycle_stages cls
        ON c.category_id = cls.category_id
      LEFT JOIN landscape.core_unit_cost_category p
        ON p.category_id = c.parent_id
      LEFT JOIN landscape.core_unit_cost_item t
        ON t.category_id = c.category_id
      WHERE c.is_active = true
      GROUP BY c.category_id, c.parent_id, p.category_name, c.category_name, c.tags, c.sort_order, c.is_active
      ORDER BY c.sort_order, c.category_name
    `;
  }

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

    // Handle both old and new schema
    let lifecycleStages: string[];
    if (Array.isArray(entry.lifecycle_stages)) {
      lifecycleStages = entry.lifecycle_stages;
    } else if (entry.lifecycle_stage) {
      lifecycleStages = [entry.lifecycle_stage];
    } else if (entry.cost_scope) {
      // Map old cost_scope to lifecycle_stage
      const scopeMap: Record<string, string> = {
        'development': 'Development',
        'acquisition': 'Acquisition',
        'operations': 'Operations',
        'disposition': 'Disposition',
      };
      lifecycleStages = [scopeMap[entry.cost_scope.toLowerCase()] || 'Development'];
    } else {
      lifecycleStages = ['Development'];
    }

    const tags = Array.isArray(entry.tags) ? entry.tags : [];
    const parent = entry.parent ? Number(entry.parent) : undefined;
    const parentName = entry.parent_name ?? undefined;
    const sortOrder = Number.isFinite(Number(entry.sort_order))
      ? Number(entry.sort_order)
      : index;
    const itemCount = Number.isFinite(Number(entry.item_count ?? entry.template_count ?? entry.count))
      ? Number(entry.item_count ?? entry.template_count ?? entry.count)
      : 0;
    const isActive = entry.is_active ?? true;

    return {
      category_id: categoryId,
      parent,
      parent_name: parentName,
      category_name: categoryName,
      lifecycle_stages: lifecycleStages,
      tags,
      sort_order: sortOrder,
      is_active: isActive,
      item_count: itemCount
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
