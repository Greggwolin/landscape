/**
 * Operations Settings API
 *
 * PUT /api/projects/:projectId/operations/settings
 * Updates operations settings like Value-Add mode toggle.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { projectId } = await params;
  const projectIdNum = parseInt(projectId, 10);

  if (isNaN(projectIdNum)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { value_add_enabled, vacancy_override_pct, management_fee_pct, management_fee_source } = body;

    // Handle value_add_enabled toggle
    if (typeof value_add_enabled === 'boolean') {
      try {
        await sql`
          UPDATE tbl_project
          SET value_add_enabled = ${value_add_enabled}
          WHERE project_id = ${projectIdNum}
        `;
      } catch (columnError) {
        console.warn('value_add_enabled column not found, migration 043 may not have run yet');
      }
    }

    // Handle vacancy override: null = clear override, number = set override
    if (vacancy_override_pct !== undefined) {
      if (vacancy_override_pct === null) {
        // Clear override — revert to rent-roll-calculated vacancy
        await sql`
          DELETE FROM tbl_project_assumption
          WHERE project_id = ${projectIdNum}
            AND assumption_key = 'vacancy_override_pct'
        `;
      } else {
        // Set override
        await sql`
          INSERT INTO tbl_project_assumption (project_id, assumption_key, assumption_value)
          VALUES (${projectIdNum}, 'vacancy_override_pct', ${String(vacancy_override_pct)})
          ON CONFLICT (project_id, assumption_key)
          DO UPDATE SET assumption_value = ${String(vacancy_override_pct)}, updated_at = NOW()
        `;
      }
    }

    // Handle management fee percentage update
    if (management_fee_pct !== undefined && typeof management_fee_pct === 'number') {
      await sql`
        INSERT INTO tbl_project_assumption (project_id, assumption_key, assumption_value)
        VALUES (${projectIdNum}, 'management_fee_pct', ${String(management_fee_pct)})
        ON CONFLICT (project_id, assumption_key)
        DO UPDATE SET assumption_value = ${String(management_fee_pct)}, updated_at = NOW()
      `;
    }

    // Handle management fee source toggle (ingestion ↔ user_modified)
    if (management_fee_source !== undefined) {
      if (management_fee_source === 'ingestion') {
        // Revert: remove the user override so the API uses ingested dollar amount
        await sql`
          DELETE FROM tbl_project_assumption
          WHERE project_id = ${projectIdNum}
            AND assumption_key = 'management_fee_source'
        `;
      } else {
        // Store that user has overridden the management fee
        await sql`
          INSERT INTO tbl_project_assumption (project_id, assumption_key, assumption_value)
          VALUES (${projectIdNum}, 'management_fee_source', ${management_fee_source})
          ON CONFLICT (project_id, assumption_key)
          DO UPDATE SET assumption_value = ${management_fee_source}, updated_at = NOW()
        `;
      }
    }

    return NextResponse.json({
      success: true,
      ...(typeof value_add_enabled === 'boolean' ? { value_add_enabled } : {}),
      ...(vacancy_override_pct !== undefined ? { vacancy_override_pct } : {}),
      ...(management_fee_pct !== undefined ? { management_fee_pct } : {}),
      ...(management_fee_source !== undefined ? { management_fee_source } : {})
    });
  } catch (error) {
    console.error('Error updating operations settings:', error);
    return NextResponse.json(
      { error: 'Failed to update operations settings' },
      { status: 500 }
    );
  }
}
