import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  MEASURE_CATEGORY_SET,
  UnitOfMeasure,
  normalizeMeasureCategory,
  normalizeMeasureCode,
  normalizeMeasureName,
} from '@/lib/measures';

type MeasurePayload = {
  measure_name?: string;
  measure_category?: string;
  is_system?: boolean;
  sort_order?: number;
};

const normalizeUpdatePayload = (
  payload: MeasurePayload,
  current: UnitOfMeasure
): { data?: UnitOfMeasure; error?: string } => {
  const measure_name = normalizeMeasureName(
    payload.measure_name ?? current.measure_name ?? ''
  );

  if (!measure_name) {
    return { error: 'Name is required' };
  }
  if (measure_name.length > 100) {
    return { error: 'Name must be 100 characters or fewer' };
  }

  const candidateCategory = normalizeMeasureCategory(
    payload.measure_category ?? current.measure_category
  );
  if (!MEASURE_CATEGORY_SET.has(candidateCategory as any)) {
    return { error: 'Please select a valid category' };
  }

  return {
    data: {
      measure_code: current.measure_code,
      measure_name,
      measure_category: candidateCategory as UnitOfMeasure['measure_category'],
      is_system: payload.is_system ?? current.is_system,
      sort_order: payload.sort_order ?? current.sort_order,
      created_at: current.created_at,
      updated_at: current.updated_at,
    },
  };
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const measureCode = normalizeMeasureCode(code);
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
    const existingRows = await sql<UnitOfMeasure[]>`
      SELECT
        measure_code,
        measure_name,
        LOWER(measure_category) AS measure_category,
        COALESCE(is_system, false) AS is_system,
        sort_order,
        ${hasUsageContextsColumn ? 'COALESCE(usage_contexts, \'[]\'::jsonb)' : '\'[]\'::jsonb'} AS usage_contexts,
        created_at,
        updated_at
      FROM landscape.tbl_measures
      WHERE LOWER(measure_code) = LOWER(${measureCode})
      LIMIT 1
    `;

    if (existingRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Measure not found' },
        { status: 404 }
      );
    }

    const current = existingRows[0];
    const body = (await request.json()) as MeasurePayload;
    const { data, error } = normalizeUpdatePayload(body, current);

    if (!data) {
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    const updated = await sql<UnitOfMeasure[]>`
      UPDATE landscape.tbl_measures
      SET
        measure_name = ${data.measure_name},
        measure_category = ${data.measure_category},
        is_system = ${Boolean(data.is_system)},
        sort_order = ${data.sort_order ?? current.sort_order},
        updated_at = CURRENT_TIMESTAMP
      WHERE LOWER(measure_code) = LOWER(${measureCode})
      RETURNING
        measure_code,
        measure_name,
        LOWER(measure_category) AS measure_category,
        COALESCE(is_system, false) AS is_system,
        sort_order,
        ${hasUsageContextsColumn ? 'COALESCE(usage_contexts, \'[]\'::jsonb)' : '\'[]\'::jsonb'} AS usage_contexts,
        created_at,
        updated_at
    `;

    return NextResponse.json({ success: true, data: updated[0] });
  } catch (error) {
    console.error('Error updating measure:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update measure' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const measureCode = normalizeMeasureCode(code);
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
    const updated = await sql<UnitOfMeasure[]>`
      UPDATE landscape.tbl_measures
      SET is_system = false, updated_at = CURRENT_TIMESTAMP
      WHERE LOWER(measure_code) = LOWER(${measureCode})
      RETURNING
        measure_code,
        measure_name,
        LOWER(measure_category) AS measure_category,
        COALESCE(is_system, false) AS is_system,
        sort_order,
        ${hasUsageContextsColumn ? 'COALESCE(usage_contexts, \'[]\'::jsonb)' : '\'[]\'::jsonb'} AS usage_contexts,
        created_at,
        updated_at
    `;

    if (updated.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Measure not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated[0] });
  } catch (error) {
    console.error('Error deactivating measure:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to deactivate measure' },
      { status: 500 }
    );
  }
}
