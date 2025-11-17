import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { updateCategoryMapping } from '@/lib/unitCostCache';

const DJANGO_API_URL = process.env.DJANGO_API_URL;
const DJANGO_FINANCIAL_BASE = DJANGO_API_URL
  ? `${DJANGO_API_URL.replace(/\/$/, '')}/api/financial`
  : null;

export type CategoryRow = {
  category_id: number;
  parent?: number | null;
  parent_name?: string | null;
  category_name: string;
  lifecycle_stages: string[];
  tags: string[];
  sort_order: number;
  is_active: boolean;
  item_count: number;
};

export type UpdateCategoryPayload = {
  category_name?: string;
  lifecycle_stages?: string[];
  tags?: string[];
  parent?: number | null;
  sort_order?: number | null;
  is_active?: boolean;
};

const LIFECYCLE_STAGE_ALIASES: Record<string, string> = {
  acquisition: 'Acquisition',
  acquisitions: 'Acquisition',
  due_diligence: 'Acquisition',
  development: 'Development',
  predevelopment: 'Development',
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
  'Development',
  'Operations',
  'Disposition',
  'Financing',
]);

function normalizeLifecycleStages(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return [];

  const stages = value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .map((entry) => {
      if (!entry) return '';
      if (VALID_LIFECYCLE_STAGES.has(entry)) return entry;
      const alias = LIFECYCLE_STAGE_ALIASES[entry.toLowerCase()];
      return alias ?? '';
    })
    .filter((entry): entry is string => Boolean(entry) && VALID_LIFECYCLE_STAGES.has(entry));

  return stages;
}

function normalizeUpdatePayload(raw: any): { data?: UpdateCategoryPayload; error?: string } {
  if (!raw || typeof raw !== 'object') {
    return { error: 'Invalid payload' };
  }

  const data: UpdateCategoryPayload = {};

  if ('category_name' in raw) {
    const name = typeof raw.category_name === 'string' ? raw.category_name.trim() : '';
    if (!name) return { error: 'Category name cannot be empty' };
    data.category_name = name;
  }

  if ('lifecycle_stages' in raw) {
    const stages = normalizeLifecycleStages(raw.lifecycle_stages);
    if (!stages || stages.length === 0) {
      return { error: 'At least one lifecycle stage is required' };
    }
    data.lifecycle_stages = stages;
  }

  if ('tags' in raw) {
    if (!Array.isArray(raw.tags)) {
      return { error: 'Tags must be an array' };
    }
    data.tags = Array.from(
      new Set(
        raw.tags
          .map((tag: unknown) => (typeof tag === 'string' ? tag.trim() : ''))
          .filter((tag: string) => Boolean(tag))
      )
    );
  }

  if ('parent' in raw || 'parent_id' in raw || 'parentId' in raw || 'parentID' in raw) {
    const parentValue =
      raw.parent ?? raw.parent_id ?? raw.parentId ?? raw.parentID ?? null;
    const parentNumber =
      typeof parentValue === 'number'
        ? parentValue
        : typeof parentValue === 'string' && parentValue.trim() !== ''
          ? Number(parentValue)
          : null;
    data.parent =
      typeof parentNumber === 'number' && Number.isFinite(parentNumber)
        ? parentNumber
        : null;
  }

  if ('sort_order' in raw) {
    const sortOrder =
      typeof raw.sort_order === 'number'
        ? raw.sort_order
        : typeof raw.sort_order === 'string' && raw.sort_order.trim() !== ''
          ? Number(raw.sort_order)
          : null;

    data.sort_order =
      typeof sortOrder === 'number' && Number.isFinite(sortOrder)
        ? sortOrder
        : null;
  }

  if ('is_active' in raw) {
    data.is_active = Boolean(raw.is_active);
  }

  return { data };
}

async function fetchCategoryRow(categoryId: number): Promise<CategoryRow | null> {
  const rows = await sql<CategoryRow>`
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
      0::INTEGER as item_count
    FROM landscape.core_unit_cost_category c
    LEFT JOIN landscape.core_category_lifecycle_stages cls
      ON c.category_id = cls.category_id
    LEFT JOIN landscape.core_unit_cost_category p
      ON p.category_id = c.parent_id
    WHERE c.category_id = ${categoryId}
    GROUP BY c.category_id, c.parent_id, p.category_name, c.category_name, c.tags, c.sort_order, c.is_active
  `;

  return rows[0] ?? null;
}

async function updateCategoryViaDjango(
  categoryId: number,
  payload: UpdateCategoryPayload
): Promise<NextResponse | null> {
  if (!DJANGO_FINANCIAL_BASE) return null;

  try {
    const response = await fetch(`${DJANGO_FINANCIAL_BASE}/unit-costs/categories/${categoryId}/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      // Allow fallback to direct SQL when Django doesn't support the operation
      if ([404, 405, 501].includes(response.status)) {
        const text = await response.text().catch(() => '');
        console.warn(
          `Django update category returned ${response.status}. Falling back to direct SQL. Body:`,
          text
        );
        return null;
      }
      const errorPayload = await response.json().catch(() => ({ error: 'Failed to update category' }));
      return NextResponse.json(errorPayload, { status: response.status });
    }

    const data = await response.json();
    updateCategoryMapping([data]);
    return NextResponse.json(data);
  } catch (error) {
    console.warn('Django update category failed, falling back to direct SQL:', error);
    return null;
  }
}

async function updateCategoryDirect(
  categoryId: number,
  payload: UpdateCategoryPayload
): Promise<NextResponse> {
  try {
    const existing = await fetchCategoryRow(categoryId);
    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const nextLifecycleStages =
      payload.lifecycle_stages ?? existing.lifecycle_stages ?? [];
    if (nextLifecycleStages.length === 0) {
      return NextResponse.json(
        { error: 'At least one lifecycle stage is required' },
        { status: 400 }
      );
    }

    const nextValues = {
      category_name: payload.category_name ?? existing.category_name,
      parent:
        payload.parent !== undefined ? payload.parent : existing.parent ?? null,
      tags: payload.tags ?? existing.tags ?? [],
      sort_order:
        payload.sort_order !== undefined && payload.sort_order !== null
          ? payload.sort_order
          : existing.sort_order,
      is_active:
        payload.is_active !== undefined ? payload.is_active : existing.is_active,
    };

    await sql`
      UPDATE landscape.core_unit_cost_category
      SET
        parent_id = ${nextValues.parent},
        category_name = ${nextValues.category_name},
        tags = ${JSON.stringify(nextValues.tags)},
        sort_order = ${nextValues.sort_order},
        is_active = ${nextValues.is_active},
        updated_at = NOW()
      WHERE category_id = ${categoryId}
    `;

    await sql`
      DELETE FROM landscape.core_category_lifecycle_stages
      WHERE category_id = ${categoryId}
    `;

    for (const [index, stage] of nextLifecycleStages.entries()) {
      await sql`
        INSERT INTO landscape.core_category_lifecycle_stages (
          category_id,
          lifecycle_stage,
          sort_order,
          created_at,
          updated_at
        )
        VALUES (
          ${categoryId},
          ${stage},
          ${index},
          NOW(),
          NOW()
        )
        ON CONFLICT (category_id, lifecycle_stage) DO UPDATE
        SET sort_order = EXCLUDED.sort_order,
            updated_at = NOW()
      `;
    }

    const updated = await fetchCategoryRow(categoryId);
    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to load updated category' },
        { status: 500 }
      );
    }

    updateCategoryMapping([updated]);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Direct SQL error updating category:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

export async function processCategoryUpdate(
  request: NextRequest,
  explicitCategoryId?: string | number | null
) {
  const rawBody = await request.json().catch(() => null);
  const { data, error } = normalizeUpdatePayload(rawBody);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  const categoryIdSource =
    explicitCategoryId ??
    rawBody?.category_id ??
    rawBody?.categoryId ??
    rawBody?.id;
  const categoryIdNumber = Number(categoryIdSource);

  if (!Number.isFinite(categoryIdNumber)) {
    return NextResponse.json(
      { error: 'Invalid category id' },
      { status: 400 }
    );
  }

  if (!data || Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: 'No changes provided' },
      { status: 400 }
    );
  }

  const djangoResponse = await updateCategoryViaDjango(categoryIdNumber, data);
  if (djangoResponse) {
    return djangoResponse;
  }

  return updateCategoryDirect(categoryIdNumber, data);
}
