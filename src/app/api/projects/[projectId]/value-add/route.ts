/**
 * Value-Add Assumptions API
 *
 * GET /api/projects/:projectId/value-add
 * Returns value-add renovation program assumptions for a project.
 *
 * PUT /api/projects/:projectId/value-add
 * Creates or updates value-add assumptions (upsert).
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// Default values for new records
const DEFAULTS = {
  is_enabled: false,
  reno_start_month: 3,
  reno_starts_per_month: 2,
  months_to_complete: 3,
  reno_cost_per_sf: 25.0,
  reno_cost_basis: 'sf',
  relocation_incentive: 3500.0,
  rent_premium_pct: 0.40,
  relet_lag_months: 2,
  renovate_all: true,
  units_to_renovate: null,
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { projectId } = await params;
  const projectIdNum = parseInt(projectId, 10);

  if (isNaN(projectIdNum)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }

  try {
    // Check if project exists
    const projectResult = await sql`
      SELECT project_id FROM landscape.tbl_project WHERE project_id = ${projectIdNum}
    `;

    if (projectResult.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get existing assumptions or return defaults
    const result = await sql`
      SELECT
        value_add_id,
        project_id,
        is_enabled,
        reno_start_month,
        reno_starts_per_month,
        months_to_complete,
        reno_cost_per_sf,
        reno_cost_basis,
        relocation_incentive,
        rent_premium_pct,
        relet_lag_months,
        renovate_all,
        units_to_renovate,
        created_at,
        updated_at
      FROM landscape.tbl_value_add_assumptions
      WHERE project_id = ${projectIdNum}
    `;

    if (result.length === 0) {
      // Return defaults with project_id but no value_add_id (not yet saved)
      return NextResponse.json({
        project_id: projectIdNum,
        ...DEFAULTS,
        created_at: null,
        updated_at: null,
      });
    }

    // Convert numeric strings to proper numbers
    const row = result[0];
    return NextResponse.json({
      ...row,
      reno_cost_per_sf: parseFloat(row.reno_cost_per_sf) || DEFAULTS.reno_cost_per_sf,
      relocation_incentive: parseFloat(row.relocation_incentive) || DEFAULTS.relocation_incentive,
      rent_premium_pct: parseFloat(row.rent_premium_pct) || DEFAULTS.rent_premium_pct,
      reno_starts_per_month: parseInt(row.reno_starts_per_month) || DEFAULTS.reno_starts_per_month,
      months_to_complete: parseInt(row.months_to_complete) || DEFAULTS.months_to_complete,
      reno_cost_basis: row.reno_cost_basis || DEFAULTS.reno_cost_basis,
    });
  } catch (error) {
    console.error('Error fetching value-add assumptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch value-add assumptions' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { projectId } = await params;
  const projectIdNum = parseInt(projectId, 10);

  if (isNaN(projectIdNum)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }

  try {
    const body = await request.json();

    // Check if project exists
    const projectResult = await sql`
      SELECT project_id FROM landscape.tbl_project WHERE project_id = ${projectIdNum}
    `;

    if (projectResult.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Extract values with defaults
    const isEnabled = body.is_enabled ?? DEFAULTS.is_enabled;
    const renoStartMonth = body.reno_start_month ?? DEFAULTS.reno_start_month;
    const renoStartsPerMonth = body.reno_starts_per_month ?? DEFAULTS.reno_starts_per_month;
    const monthsToComplete = body.months_to_complete ?? DEFAULTS.months_to_complete;
    const renoCostPerSf = body.reno_cost_per_sf ?? DEFAULTS.reno_cost_per_sf;
    const renoCostBasis = body.reno_cost_basis ?? DEFAULTS.reno_cost_basis;
    const relocationIncentive = body.relocation_incentive ?? DEFAULTS.relocation_incentive;
    const rentPremiumPct = body.rent_premium_pct ?? DEFAULTS.rent_premium_pct;
    const reletLagMonths = body.relet_lag_months ?? DEFAULTS.relet_lag_months;
    const renovateAll = body.renovate_all ?? DEFAULTS.renovate_all;
    const unitsToRenovate = body.units_to_renovate ?? DEFAULTS.units_to_renovate;

    // Upsert: insert or update on conflict
    const result = await sql`
      INSERT INTO landscape.tbl_value_add_assumptions (
        project_id,
        is_enabled,
        reno_start_month,
        reno_starts_per_month,
        months_to_complete,
        reno_cost_per_sf,
        reno_cost_basis,
        relocation_incentive,
        rent_premium_pct,
        relet_lag_months,
        renovate_all,
        units_to_renovate,
        created_at,
        updated_at
      ) VALUES (
        ${projectIdNum},
        ${isEnabled},
        ${renoStartMonth},
        ${renoStartsPerMonth},
        ${monthsToComplete},
        ${renoCostPerSf},
        ${renoCostBasis},
        ${relocationIncentive},
        ${rentPremiumPct},
        ${reletLagMonths},
        ${renovateAll},
        ${unitsToRenovate},
        NOW(),
        NOW()
      )
      ON CONFLICT (project_id) DO UPDATE SET
        is_enabled = EXCLUDED.is_enabled,
        reno_start_month = EXCLUDED.reno_start_month,
        reno_starts_per_month = EXCLUDED.reno_starts_per_month,
        months_to_complete = EXCLUDED.months_to_complete,
        reno_cost_per_sf = EXCLUDED.reno_cost_per_sf,
        reno_cost_basis = EXCLUDED.reno_cost_basis,
        relocation_incentive = EXCLUDED.relocation_incentive,
        rent_premium_pct = EXCLUDED.rent_premium_pct,
        relet_lag_months = EXCLUDED.relet_lag_months,
        renovate_all = EXCLUDED.renovate_all,
        units_to_renovate = EXCLUDED.units_to_renovate,
        updated_at = NOW()
      RETURNING *
    `;

    const row = result[0];
    return NextResponse.json({
      ...row,
      reno_cost_per_sf: parseFloat(row.reno_cost_per_sf),
      relocation_incentive: parseFloat(row.relocation_incentive),
      rent_premium_pct: parseFloat(row.rent_premium_pct),
    });
  } catch (error) {
    console.error('Error saving value-add assumptions:', error);
    return NextResponse.json(
      { error: 'Failed to save value-add assumptions' },
      { status: 500 }
    );
  }
}
