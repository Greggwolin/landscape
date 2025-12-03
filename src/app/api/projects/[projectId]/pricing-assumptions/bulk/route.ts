/**
 * POST /api/projects/[projectId]/pricing-assumptions/bulk
 *
 * Bulk upsert pricing assumptions - handles multiple rows in ONE SQL statement
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { assumptions } = await request.json();

    if (!projectId || !assumptions || !Array.isArray(assumptions) || assumptions.length === 0) {
      return NextResponse.json(
        { error: 'projectId and assumptions array are required' },
        { status: 400 }
      );
    }

    console.log(`[bulk] Upserting ${assumptions.length} pricing assumptions for project ${projectId}`);

    // Extract arrays for bulk upsert
    const ids = assumptions.map(a => a.id || null);
    const luTypeCodes = assumptions.map(a => a.lu_type_code);
    const productCodes = assumptions.map(a => a.product_code || null);
    const pricesPerUnit = assumptions.map(a => a.price_per_unit || 0);
    const uoms = assumptions.map(a => a.unit_of_measure || 'FF');
    const growthRates = assumptions.map(a => a.growth_rate ?? 0.035);

    // Use PostgreSQL unnest() for true bulk upsert in ONE query
    // This handles both INSERTs (for new rows without id) and UPDATEs (for existing rows with id)
    const result = await sql`
      WITH input_data AS (
        SELECT
          unnest(${ids}::bigint[]) as id,
          unnest(${luTypeCodes}::text[]) as lu_type_code,
          unnest(${productCodes}::text[]) as product_code,
          unnest(${pricesPerUnit}::numeric[]) as price_per_unit,
          unnest(${uoms}::text[]) as unit_of_measure,
          unnest(${growthRates}::numeric[]) as growth_rate
      ),
      upserted AS (
        INSERT INTO landscape.land_use_pricing (
          project_id,
          lu_type_code,
          product_code,
          price_per_unit,
          unit_of_measure,
          growth_rate,
          created_at,
          updated_at
        )
        SELECT
          ${projectId}::bigint,
          lu_type_code,
          product_code,
          price_per_unit,
          unit_of_measure,
          growth_rate,
          NOW(),
          NOW()
        FROM input_data
        WHERE id IS NULL
        RETURNING *
      ),
      updated AS (
        UPDATE landscape.land_use_pricing lup
        SET
          lu_type_code = input_data.lu_type_code,
          product_code = input_data.product_code,
          price_per_unit = input_data.price_per_unit,
          unit_of_measure = input_data.unit_of_measure,
          growth_rate = input_data.growth_rate,
          updated_at = NOW()
        FROM input_data
        WHERE lup.id = input_data.id
          AND lup.project_id = ${projectId}
          AND input_data.id IS NOT NULL
        RETURNING lup.*
      )
      SELECT * FROM upserted
      UNION ALL
      SELECT * FROM updated
    `;

    console.log(`[bulk] Successfully upserted ${result.length} rows`);

    return NextResponse.json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error('Error in bulk pricing assumptions:', error);
    return NextResponse.json(
      {
        error: 'Failed to bulk save pricing assumptions',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
