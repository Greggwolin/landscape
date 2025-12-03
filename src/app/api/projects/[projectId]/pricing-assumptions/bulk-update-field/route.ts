/**
 * POST /api/projects/[projectId]/pricing-assumptions/bulk-update-field
 *
 * Update a single field across ALL pricing assumptions for a project
 * Used for global changes like growth rate that apply to all rows
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { field, value } = await request.json();

    if (!projectId || !field) {
      return NextResponse.json(
        { error: 'projectId and field are required' },
        { status: 400 }
      );
    }

    // Whitelist allowed fields to prevent SQL injection
    const allowedFields = ['growth_rate', 'unit_of_measure'];
    if (!allowedFields.includes(field)) {
      return NextResponse.json(
        { error: `Field '${field}' is not allowed for bulk update. Allowed: ${allowedFields.join(', ')}` },
        { status: 400 }
      );
    }

    console.log(`[bulk-update-field] Updating ${field} = ${value} for all pricing assumptions in project ${projectId}`);

    // Use parameterized query for safety
    let result;
    if (field === 'growth_rate') {
      result = await sql`
        UPDATE landscape.land_use_pricing
        SET growth_rate = ${value ?? 0.035}, updated_at = NOW()
        WHERE project_id = ${projectId}
        RETURNING *
      `;
    } else if (field === 'unit_of_measure') {
      result = await sql`
        UPDATE landscape.land_use_pricing
        SET unit_of_measure = ${value || 'FF'}, updated_at = NOW()
        WHERE project_id = ${projectId}
        RETURNING *
      `;
    }

    console.log(`[bulk-update-field] Successfully updated ${result?.length || 0} rows`);

    return NextResponse.json({
      success: true,
      count: result?.length || 0,
      field,
      value,
      data: result,
    });
  } catch (error) {
    console.error('Error in bulk field update:', error);
    return NextResponse.json(
      {
        error: 'Failed to bulk update field',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
