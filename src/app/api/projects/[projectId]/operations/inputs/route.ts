/**
 * Operations Inputs API
 *
 * PUT /api/projects/:projectId/operations/inputs
 * Saves user input changes for operations line items.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

import { requireAuth, requireProjectAccess } from '@/lib/api/requireAuth';
interface RouteParams {
  params: Promise<{ projectId: string }>;
}

interface InputUpdate {
  section: string;
  line_item_key: string;
  category_id?: number;
  as_is_value?: number | null;
  as_is_count?: number | null;
  as_is_rate?: number | null;
  as_is_growth_rate?: number | null;
  post_reno_value?: number | null;
  post_reno_count?: number | null;
  post_reno_rate?: number | null;
  post_reno_per_sf?: number | null;
  post_reno_growth_rate?: number | null;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { projectId: __projectIdParam } = await params;
  const __auth = await requireProjectAccess(request, __projectIdParam);
  if (__auth instanceof NextResponse) return __auth;

  const { projectId } = await params;
  const projectIdNum = parseInt(projectId, 10);

  if (isNaN(projectIdNum)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { updates } = body as { updates: InputUpdate[] };

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: 'Missing updates array' }, { status: 400 });
    }

    // Process each update with upsert
    for (const update of updates) {
      // Special handling: management fee percentage changes also update the assumption
      if (update.line_item_key === 'calculated_management_fee') {
        if (update.as_is_rate != null) {
          await sql`
            INSERT INTO tbl_project_assumption (project_id, assumption_key, assumption_value)
            VALUES (${projectIdNum}, 'management_fee_pct', ${String(update.as_is_rate)})
            ON CONFLICT (project_id, assumption_key)
            DO UPDATE SET assumption_value = ${String(update.as_is_rate)}, updated_at = NOW()
          `;
        }
        if (update.post_reno_rate != null) {
          // Post-reno management fee pct also stored in main assumption for now
          // (both scenarios share the same field unless a separate one is added)
          await sql`
            INSERT INTO tbl_project_assumption (project_id, assumption_key, assumption_value)
            VALUES (${projectIdNum}, 'management_fee_pct', ${String(update.post_reno_rate)})
            ON CONFLICT (project_id, assumption_key)
            DO UPDATE SET assumption_value = ${String(update.post_reno_rate)}, updated_at = NOW()
          `;
        }
        continue; // Skip the generic user_inputs upsert for management fee
      }

      await sql`
        INSERT INTO tbl_operations_user_inputs (
          project_id,
          section,
          line_item_key,
          category_id,
          as_is_value,
          as_is_count,
          as_is_rate,
          as_is_growth_rate,
          post_reno_value,
          post_reno_count,
          post_reno_rate,
          post_reno_per_sf,
          post_reno_growth_rate,
          updated_at
        ) VALUES (
          ${projectIdNum},
          ${update.section},
          ${update.line_item_key},
          ${update.category_id || null},
          ${update.as_is_value ?? null},
          ${update.as_is_count ?? null},
          ${update.as_is_rate ?? null},
          ${update.as_is_growth_rate ?? null},
          ${update.post_reno_value ?? null},
          ${update.post_reno_count ?? null},
          ${update.post_reno_rate ?? null},
          ${update.post_reno_per_sf ?? null},
          ${update.post_reno_growth_rate ?? null},
          NOW()
        )
        ON CONFLICT (project_id, section, line_item_key)
        DO UPDATE SET
          as_is_value = COALESCE(EXCLUDED.as_is_value, tbl_operations_user_inputs.as_is_value),
          as_is_count = COALESCE(EXCLUDED.as_is_count, tbl_operations_user_inputs.as_is_count),
          as_is_rate = COALESCE(EXCLUDED.as_is_rate, tbl_operations_user_inputs.as_is_rate),
          as_is_growth_rate = COALESCE(EXCLUDED.as_is_growth_rate, tbl_operations_user_inputs.as_is_growth_rate),
          post_reno_value = COALESCE(EXCLUDED.post_reno_value, tbl_operations_user_inputs.post_reno_value),
          post_reno_count = COALESCE(EXCLUDED.post_reno_count, tbl_operations_user_inputs.post_reno_count),
          post_reno_rate = COALESCE(EXCLUDED.post_reno_rate, tbl_operations_user_inputs.post_reno_rate),
          post_reno_per_sf = COALESCE(EXCLUDED.post_reno_per_sf, tbl_operations_user_inputs.post_reno_per_sf),
          post_reno_growth_rate = COALESCE(EXCLUDED.post_reno_growth_rate, tbl_operations_user_inputs.post_reno_growth_rate),
          updated_at = NOW()
      `;
    }

    return NextResponse.json({
      success: true,
      updated_count: updates.length
    });
  } catch (error) {
    console.error('Error saving operations inputs:', error);
    return NextResponse.json(
      { error: 'Failed to save operations inputs' },
      { status: 500 }
    );
  }
}
