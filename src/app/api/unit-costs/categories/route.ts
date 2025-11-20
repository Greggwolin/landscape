import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getFallbackUnitCostData } from '@/lib/unitCostFallback';
import { updateCategoryMapping } from '@/lib/unitCostCache';
import { processCategoryUpdate } from './update-handler';

const DJANGO_API_URL = process.env.DJANGO_API_URL;
const LIFECYCLE_STAGE_ALIASES: Record<string, string> = {
  acquisition: 'Acquisition',
  acquisitions: 'Acquisition',
  due_diligence: 'Acquisition',
  planning: 'Planning & Engineering',
  engineering: 'Planning & Engineering',
  predevelopment: 'Planning & Engineering',
  development: 'Development',
  construction: 'Development',
  operations: 'Operations',
  operating: 'Operations',
  disposition: 'Disposition',
  exit: 'Disposition',
  financing: 'Financing',
  finance: 'Financing',
  capital: 'Financing',
};
const VALID_LIFECYCLE_STAGES = new Set([
  'Acquisition',
  'Planning & Engineering',
  'Development',
  'Operations',
  'Disposition',
  'Financing',
]);

type CategoryRow = {
  category_id: number;
  parent?: number;
  parent_name?: string;
  category_name: string;
  activitys: string[];
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
  const activity = searchParams.get('activity') ?? searchParams.get('cost_scope') ?? null;
  const tag = searchParams.get('tag') ?? null;
  const parentId = searchParams.get('parent') ?? null;
  const projectTypeCode = searchParams.get('project_type_code') ?? null;

  let result: CategoryRow[];

  if (activity && !tag && !parentId) {
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
          ARRAY_AGG(DISTINCT cls.activity) FILTER (WHERE cls.activity IS NOT NULL),
          ARRAY[]::varchar[]
        ) as activitys,
        COALESCE(c.tags::jsonb, '[]'::jsonb) as tags,
        c.sort_order,
        c.is_active,
        CAST(COUNT(*) FILTER (WHERE t.is_active = true ${templateCountFilter}) AS INTEGER) AS item_count
      FROM landscape.core_unit_cost_category c
      INNER JOIN landscape.core_category_lifecycle_stages cls
        ON c.category_id = cls.category_id AND cls.activity = ${activity}
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
          ARRAY_AGG(DISTINCT cls.activity) FILTER (WHERE cls.activity IS NOT NULL),
          ARRAY[]::varchar[]
        ) as activitys,
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
    let activitys: string[];
    if (Array.isArray(entry.activitys)) {
      activitys = entry.activitys;
    } else if (entry.activity) {
      activitys = [entry.activity];
    } else if (entry.cost_scope) {
      // Map old cost_scope to activity
      const scopeMap: Record<string, string> = {
        'development': 'Development',
        'acquisition': 'Acquisition',
        'operations': 'Operations',
        'disposition': 'Disposition',
      };
      activitys = [scopeMap[entry.cost_scope.toLowerCase()] || 'Development'];
    } else {
      activitys = ['Development'];
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
      activitys: activitys,
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

export async function PUT(request: NextRequest) {
  return processCategoryUpdate(request);
}

type CreateCategoryPayload = {
  category_name: string;
  activitys: string[];
  tags: string[];
  parent: number | null;
  sort_order: number | null;
};

function normalizeCreatePayload(raw: any): { data?: CreateCategoryPayload; error?: string } {
  if (!raw || typeof raw !== 'object') {
    return { error: 'Invalid request body' };
  }

  const name = typeof raw.category_name === 'string' ? raw.category_name.trim() : '';
  if (!name) {
    return { error: 'Category name is required' };
  }

  const activitys = Array.isArray(raw.activitys)
    ? raw.activitys
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .map((value) => {
          const key = value.toLowerCase();
          return VALID_LIFECYCLE_STAGES.has(value)
            ? value
            : LIFECYCLE_STAGE_ALIASES[key] ?? '';
        })
        .filter((stage) => stage && VALID_LIFECYCLE_STAGES.has(stage))
    : [];

  if (activitys.length === 0) {
    return { error: 'At least one lifecycle stage is required' };
  }

  const tags = Array.isArray(raw.tags)
    ? Array.from(
        new Set(
          raw.tags
            .map((tag: unknown) => (typeof tag === 'string' ? tag.trim() : ''))
            .filter((tag: string) => Boolean(tag))
        )
      )
    : [];

  const parentValue =
    raw.parent ?? raw.parent_id ?? raw.parentId ?? raw.parentID ?? null;
  const parentNumber =
    typeof parentValue === 'number'
      ? parentValue
      : typeof parentValue === 'string' && parentValue.trim()
        ? Number(parentValue)
        : null;
  const parent =
    typeof parentNumber === 'number' && Number.isFinite(parentNumber)
      ? parentNumber
      : null;

  const sortOrderInput =
    typeof raw.sort_order === 'number'
      ? raw.sort_order
      : typeof raw.sort_order === 'string' && raw.sort_order.trim() !== ''
        ? Number(raw.sort_order)
        : null;
  const sort_order =
    typeof sortOrderInput === 'number' && Number.isFinite(sortOrderInput)
      ? sortOrderInput
      : null;

  return {
    data: {
      category_name: name,
      activitys: activitys,
      tags,
      parent,
      sort_order,
    },
  };
}

async function createCategoryViaDjango(payload: CreateCategoryPayload) {
  if (!DJANGO_API_URL) return null;

  try {
    const response = await fetch(
      `${DJANGO_API_URL.replace(/\/$/, '')}/api/unit-costs/categories/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_name: payload.category_name,
          activitys: payload.activitys,
          tags: payload.tags,
          parent: payload.parent,
          sort_order:
            payload.sort_order !== null ? payload.sort_order : undefined,
          is_active: true,
        }),
      }
    );

    if (!response.ok) {
      const errorPayload = await response
        .json()
        .catch(() => ({ error: response.statusText }));
      return NextResponse.json(errorPayload, { status: response.status });
    }

    const created = await response.json();
    updateCategoryMapping([created]);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.warn('Django create category failed, falling back to direct SQL:', error);
    return null;
  }
}

async function createCategoryDirect(payload: CreateCategoryPayload) {
  try {
    let resolvedSortOrder = payload.sort_order;
    if (resolvedSortOrder === null) {
      const [row] = await sql<{ next_sort: number }>`
        SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_sort
        FROM landscape.core_unit_cost_category
      `;
      resolvedSortOrder = Number(row?.next_sort ?? 0);
    }

    const [inserted] = await sql<{
      category_id: number;
      parent: number | null;
      category_name: string;
      tags: string[];
      sort_order: number;
      is_active: boolean;
    }>`
      INSERT INTO landscape.core_unit_cost_category (
        parent_id,
        category_name,
        tags,
        sort_order,
        is_active,
        created_at,
        updated_at
      )
      VALUES (
        ${payload.parent},
        ${payload.category_name},
        ${JSON.stringify(payload.tags)},
        ${resolvedSortOrder},
        true,
        NOW(),
        NOW()
      )
      RETURNING category_id, parent_id AS parent, category_name, tags, sort_order, is_active
    `;

    if (!inserted) {
      return NextResponse.json(
        { error: 'Failed to insert category' },
        { status: 500 }
      );
    }

    // Insert lifecycle stages
    if (payload.activitys.length === 0) {
      console.warn(`Category ${inserted.category_id} created with no lifecycle stages - this should not happen`);
    }

    for (const [index, stage] of payload.activitys.entries()) {
      try {
        await sql`
          INSERT INTO landscape.core_category_lifecycle_stages (
            category_id,
            activity,
            sort_order,
            created_at,
            updated_at
          )
          VALUES (
            ${inserted.category_id},
            ${stage},
            ${index},
            NOW(),
            NOW()
          )
          ON CONFLICT (category_id, activity) DO UPDATE
          SET updated_at = NOW()
        `;
        console.log(`✓ Inserted lifecycle stage: ${stage} for category ${inserted.category_id}`);
      } catch (stageError) {
        console.error(`Failed to insert lifecycle stage ${stage}:`, stageError);
        // Rollback: delete the category we just created
        await sql`DELETE FROM landscape.core_unit_cost_category WHERE category_id = ${inserted.category_id}`;
        return NextResponse.json(
          { error: `Failed to assign lifecycle stage: ${stage}` },
          { status: 500 }
        );
      }
    }

    const [complete] = await sql<CategoryRow>`
      SELECT
        c.category_id,
        c.parent_id as parent,
        p.category_name as parent_name,
        c.category_name,
        COALESCE(
          ARRAY_AGG(DISTINCT cls.activity) FILTER (WHERE cls.activity IS NOT NULL),
          ARRAY[]::varchar[]
        ) as activitys,
        COALESCE(c.tags::jsonb, '[]'::jsonb) as tags,
        c.sort_order,
        c.is_active,
        0::INTEGER as item_count
      FROM landscape.core_unit_cost_category c
      LEFT JOIN landscape.core_category_lifecycle_stages cls
        ON c.category_id = cls.category_id
      LEFT JOIN landscape.core_unit_cost_category p
        ON p.category_id = c.parent_id
      WHERE c.category_id = ${inserted.category_id}
      GROUP BY c.category_id, c.parent_id, p.category_name, c.category_name, c.tags, c.sort_order, c.is_active
    `;

    if (!complete) {
      return NextResponse.json(
        { error: 'Failed to load newly created category' },
        { status: 500 }
      );
    }

    updateCategoryMapping([complete]);
    return NextResponse.json(complete, { status: 201 });
  } catch (error) {
    console.error('Direct SQL error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { data, error } = normalizeCreatePayload(await request.json().catch(() => null));
  if (error || !data) {
    return NextResponse.json(
      { error: error ?? 'Invalid payload' },
      { status: 400 }
    );
  }

  // Try Django API first if available, fallback to direct SQL when unavailable.
  const djangoResponse = await createCategoryViaDjango(data);
  if (djangoResponse) {
    return djangoResponse;
  }

  return createCategoryDirect(data);
}
