/**
 * GET /api/projects/[projectId]/pricing-assumptions
 * POST /api/projects/[projectId]/pricing-assumptions
 *
 * Manages land use pricing assumptions for sales projections
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Fetch pricing assumptions from land_use_pricing table
    const result = await sql`
      SELECT
        lup.id,
        lup.project_id,
        lup.lu_type_code,
        lup.product_code,
        lup.price_per_unit,
        lup.unit_of_measure,
        lup.growth_rate,
        lup.created_at,
        lup.updated_at
      FROM landscape.land_use_pricing lup
      WHERE lup.project_id = ${projectId}
      ORDER BY lup.lu_type_code, lup.product_code
    `;

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching pricing assumptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing assumptions', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { assumptions } = await request.json();

    if (!projectId || !assumptions || !Array.isArray(assumptions)) {
      return NextResponse.json(
        { error: 'projectId and assumptions array are required' },
        { status: 400 }
      );
    }

    // Delete all existing pricing for this project
    await sql`DELETE FROM landscape.land_use_pricing WHERE project_id = ${projectId}`;

    // Insert new pricing assumptions
    const results = [];
    for (const assumption of assumptions) {
      const luCode = assumption.lu_type_code;
      const prodCode = assumption.product_code || null;
      const pricePerUnit = assumption.price_per_unit || 0;
      const uom = assumption.unit_of_measure || 'FF';
      // Use nullish coalescing to allow 0 as a valid value (0% growth)
      const growthRate = assumption.growth_rate ?? 0.035;

      const result = await sql`
        INSERT INTO landscape.land_use_pricing (
          project_id,
          lu_type_code,
          product_code,
          price_per_unit,
          unit_of_measure,
          growth_rate
        ) VALUES (
          ${projectId},
          ${luCode},
          ${prodCode},
          ${pricePerUnit},
          ${uom},
          ${growthRate}
        )
        RETURNING *
      `;
      results.push(result[0]);
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error saving pricing assumptions:', error);
    return NextResponse.json(
      { error: 'Failed to save pricing assumptions', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
