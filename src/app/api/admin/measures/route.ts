import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  MEASURE_CATEGORY_SET,
  UnitOfMeasure,
  normalizeMeasureCategory,
  normalizeMeasureCode,
  normalizeMeasureName,
  sortMeasures,
} from '@/lib/measures';

type MeasurePayload = {
  measure_code?: string;
  measure_name?: string;
  measure_category?: string;
  is_system?: boolean;
  created_by?: number | null;
};

const validateMeasurePayload = (
  payload: MeasurePayload,
  { requireCode }: { requireCode: boolean }
): { data?: UnitOfMeasure & { created_by: number | null }; error?: string } => {
  const rawCode = payload.measure_code ?? '';
  const measure_code = normalizeMeasureCode(rawCode);

  if (requireCode) {
    if (!/^[A-Za-z0-9]{2,10}$/.test(measure_code)) {
      return { error: 'Code must be 2-10 alphanumeric characters' };
    }
  }

  const rawName = payload.measure_name ?? '';
  const measure_name = normalizeMeasureName(rawName);
  if (!measure_name) {
    return { error: 'Name is required' };
  }
  if (measure_name.length > 100) {
    return { error: 'Name must be 100 characters or fewer' };
  }

  const rawCategory = normalizeMeasureCategory(payload.measure_category ?? '');
  if (!MEASURE_CATEGORY_SET.has(rawCategory as any)) {
    return { error: 'Please select a valid category' };
  }
  const measure_category = rawCategory as UnitOfMeasure['measure_category'];

  const is_system = payload.is_system ?? true;
  const created_by = payload.created_by ?? null;

  return {
    data: {
      measure_code,
      measure_name,
      measure_category,
      is_system: Boolean(is_system),
      created_by,
    },
  };
};

export async function GET() {
  try {
    const hasUsageContextsColumn = await (async () => {
      try {
        const result = await sql<{ exists: boolean }[]>`
          SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'landscape'
              AND table_name = 'tbl_measures'
              AND column_name = 'usage_contexts'
          ) AS exists
        `;
        return result[0]?.exists ?? false;
      } catch {
        return false;
      }
    })();

    const rows = await sql<
      (UnitOfMeasure & { created_by: number | null })[]
    >`
      SELECT
        measure_code,
        measure_name,
        LOWER(measure_category) AS measure_category,
        COALESCE(is_system, false) AS is_system,
        sort_order,
        ${hasUsageContextsColumn ? 'COALESCE(usage_contexts, \'[]\'::jsonb)' : '\'[]\'::jsonb'} AS usage_contexts,
        created_at,
        updated_at,
        created_by
      FROM landscape.tbl_measures
      ORDER BY sort_order NULLS LAST, measure_category, measure_code
    `;

    return NextResponse.json({
      success: true,
      data: sortMeasures(rows),
    });
  } catch (error) {
    console.error('Error fetching measures:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch measures' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MeasurePayload;
    const { data, error } = validateMeasurePayload(body, { requireCode: true });

    if (!data) {
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    const duplicateCheck = await sql`
      SELECT 1
      FROM landscape.tbl_measures
      WHERE LOWER(measure_code) = LOWER(${data.measure_code})
      LIMIT 1
    `;

    if (duplicateCheck.length > 0) {
      return NextResponse.json(
        { success: false, error: 'This code already exists' },
        { status: 409 }
      );
    }

    const nextOrderRow = await sql<{ next_order: number }[]>`
      SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order
      FROM landscape.tbl_measures;
    `;
    const nextSort = nextOrderRow[0]?.next_order ?? 1;

    const inserted = await sql<
      (UnitOfMeasure & { created_by: number | null })[]
    >`
      INSERT INTO landscape.tbl_measures (
        measure_code,
        measure_name,
        measure_category,
        is_system,
        created_by,
        sort_order
      ) VALUES (
        ${data.measure_code},
        ${data.measure_name},
        ${data.measure_category},
        ${data.is_system},
        ${data.created_by},
        ${nextSort}
      )
      RETURNING
        measure_code,
        measure_name,
        LOWER(measure_category) AS measure_category,
        COALESCE(is_system, false) AS is_system,
        sort_order,
        COALESCE(usage_contexts, '[]'::jsonb) AS usage_contexts,
        created_at,
        updated_at,
        created_by
    `;

    return NextResponse.json(
      { success: true, data: inserted[0] },
      { status: 201 }
    );
  } catch (error: any) {
    const message =
      typeof error?.message === 'string' ? error.message : 'Failed to create measure';
    console.error('Error creating measure:', error);
    const conflict =
      message.toLowerCase().includes('unique') &&
      message.toLowerCase().includes('measure_code');
    return NextResponse.json(
      { success: false, error: conflict ? 'This code already exists' : message },
      { status: conflict ? 409 : 500 }
    );
  }
}
