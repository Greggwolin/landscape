/**
 * GET /api/measures
 *
 * Returns units of measure for UOM dropdown in budget grid
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const systemOnly = searchParams.get('systemOnly') === 'true';
    const context = searchParams.get('context');

    // Detect if usage_contexts column exists to avoid breaking on older schemas
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

    const values: unknown[] = [];
    let query = `
      SELECT
        measure_code AS code,
        measure_name AS name,
        measure_category AS category,
        is_system,
        sort_order,
        ${hasUsageContextsColumn ? 'COALESCE(usage_contexts, \'[]\'::jsonb)' : '\'[]\'::jsonb'} AS usage_contexts
      FROM landscape.tbl_measures
      WHERE 1=1
    `;

    if (systemOnly) {
      query += ' AND is_system = true';
    }

    if (context && hasUsageContextsColumn) {
      values.push(`"${context}"`);
      query += ` AND usage_contexts @> $${values.length}::jsonb`;
    }

    query += ' ORDER BY sort_order NULLS LAST, measure_category, measure_code';

    const rows = await sql.query<{
      code: string;
      name: string;
      category: string | null;
      is_system: boolean | null;
      sort_order: number | null;
      usage_contexts: string[] | null;
    }>(query, values);

    // Map to expected format
    const measures = rows.map((row) => ({
      code: row.code,
      label: row.name ? `${row.code} - ${row.name}` : row.code,
      name: row.name,
      type: row.category ?? null,
      is_system: row.is_system ?? false,
      sort_order: row.sort_order ?? null,
      usage_contexts: row.usage_contexts ?? []
    }));

    return NextResponse.json(measures);
  } catch (error) {
    console.error('Error fetching measures:', error);
    return NextResponse.json(
      { error: 'Failed to fetch measures', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
