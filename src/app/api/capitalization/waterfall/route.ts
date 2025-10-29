/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * GET /api/capitalization/waterfall
 * List all waterfall tiers for a project
 *
 * Query params:
 * - projectId (required): The project ID
 * - active_only (optional): Filter to only active tiers
 *
 * Note: Waterfall tiers are linked via equity_structure_id
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const activeOnly = searchParams.get('active_only') === 'true';

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Get waterfall tiers via equity_structure join - ALL 9 fields
    const tiers = await sql`
      SELECT
        wt.tier_id,
        wt.equity_structure_id,
        COALESCE(wt.project_id, es.project_id) as project_id,
        wt.tier_number,
        COALESCE(wt.tier_name, wt.tier_description) as tier_name,
        wt.tier_description,
        wt.irr_threshold_pct,
        wt.equity_multiple_threshold,
        wt.hurdle_type,
        wt.hurdle_rate,
        wt.lp_split_pct,
        wt.gp_split_pct,
        wt.is_pari_passu,
        wt.is_lookback_tier,
        wt.catch_up_to_pct,
        wt.has_catch_up,
        wt.catch_up_pct,
        wt.is_active,
        wt.display_order,
        wt.created_at,
        wt.updated_at
      FROM landscape.tbl_waterfall_tier wt
      JOIN landscape.tbl_equity_structure es ON wt.equity_structure_id = es.equity_structure_id
      WHERE COALESCE(wt.project_id, es.project_id) = ${parseInt(projectId)}
      ORDER BY COALESCE(wt.display_order, wt.tier_number) ASC
    `;

    // Transform to API schema - ALL 9 fields
    const transformedTiers = tiers.map((t: any) => ({
      tier_id: Number(t.tier_id),
      project_id: Number(t.project_id),
      tier_number: t.tier_number,
      tier_name: t.tier_name,

      // Return Thresholds - use direct fields or fallback to hurdle_type/hurdle_rate
      irr_threshold_pct: t.irr_threshold_pct
        ? Number(t.irr_threshold_pct)
        : (t.hurdle_type === 'IRR' && t.hurdle_rate ? Number(t.hurdle_rate) : null),
      equity_multiple_threshold: t.equity_multiple_threshold
        ? Number(t.equity_multiple_threshold)
        : (t.hurdle_type === 'MULTIPLE' && t.hurdle_rate ? Number(t.hurdle_rate) : null),

      // Distribution splits (already as percentages in DB)
      lp_split_pct: Number(t.lp_split_pct),
      gp_split_pct: Number(t.gp_split_pct),

      // Advanced Characteristics
      is_pari_passu: t.is_pari_passu || false,
      is_lookback_tier: t.is_lookback_tier || false,
      catch_up_to_pct: t.catch_up_to_pct ? Number(t.catch_up_to_pct) : null,

      // Status
      is_active: t.is_active !== undefined ? t.is_active : true,
      display_order: t.display_order || null,

      // Metadata
      created_at: t.created_at,
      updated_at: t.updated_at,
    }));

    // Filter by active_only if requested (though all are active)
    const filteredTiers = activeOnly
      ? transformedTiers.filter(t => t.is_active)
      : transformedTiers;

    return NextResponse.json({
      success: true,
      data: filteredTiers,
    });
  } catch (error) {
    console.error('Error fetching waterfall tiers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch waterfall tiers' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/capitalization/waterfall
 * Create a new waterfall tier
 *
 * Validates that lp_split_pct + gp_split_pct = 100
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      project_id,
      tier_number,
      tier_name,
      irr_threshold_pct,
      equity_multiple_threshold,
      lp_split_pct,
      gp_split_pct,
      has_catch_up = false,
      catch_up_pct,
    } = body;

    // Validation
    if (!project_id || tier_number === undefined || !tier_name || lp_split_pct === undefined || gp_split_pct === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: project_id, tier_number, tier_name, lp_split_pct, gp_split_pct',
        },
        { status: 400 }
      );
    }

    // Validate splits total 100%
    if (Math.abs((lp_split_pct + gp_split_pct) - 100) > 0.01) {
      return NextResponse.json(
        {
          success: false,
          error: `LP and GP splits must total 100%. Current: LP=${lp_split_pct}%, GP=${gp_split_pct}%, Total=${lp_split_pct + gp_split_pct}%`,
        },
        { status: 400 }
      );
    }

    // Get or create equity_structure_id for this project
    const existingStructure = await sql`
      SELECT equity_structure_id
      FROM landscape.tbl_equity_structure
      WHERE project_id = ${project_id}
      LIMIT 1
    `;

    let equityStructureId;

    if (existingStructure.length > 0) {
      equityStructureId = Number(existingStructure[0].equity_structure_id);
    } else {
      // Create new equity structure
      const newStructure = await sql`
        INSERT INTO landscape.tbl_equity_structure (
          project_id,
          lp_ownership_pct,
          gp_ownership_pct,
          preferred_return_pct
        ) VALUES (
          ${project_id},
          90.00,
          10.00,
          0.08
        )
        RETURNING equity_structure_id
      `;
      equityStructureId = Number(newStructure[0].equity_structure_id);
    }

    // Determine hurdle type and rate
    let hurdleType = null;
    let hurdleRate = null;

    if (irr_threshold_pct !== undefined && irr_threshold_pct !== null) {
      hurdleType = 'IRR';
      hurdleRate = irr_threshold_pct;
    } else if (equity_multiple_threshold !== undefined && equity_multiple_threshold !== null) {
      hurdleType = 'MULTIPLE';
      hurdleRate = equity_multiple_threshold;
    }

    const result = await sql`
      INSERT INTO landscape.tbl_waterfall_tier (
        equity_structure_id,
        tier_number,
        tier_description,
        hurdle_type,
        hurdle_rate,
        lp_split_pct,
        gp_split_pct,
        has_catch_up,
        catch_up_pct
      ) VALUES (
        ${equityStructureId},
        ${tier_number},
        ${tier_name},
        ${hurdleType},
        ${hurdleRate},
        ${lp_split_pct},
        ${gp_split_pct},
        ${has_catch_up},
        ${catch_up_pct || null}
      )
      RETURNING tier_id, tier_number, tier_description, lp_split_pct, gp_split_pct, created_at
    `;

    const newTier = result[0];

    return NextResponse.json(
      {
        success: true,
        data: {
          tier_id: Number(newTier.tier_id),
          tier_number: newTier.tier_number,
          tier_name: newTier.tier_description,
          lp_split_pct: Number(newTier.lp_split_pct),
          gp_split_pct: Number(newTier.gp_split_pct),
        },
        message: 'Waterfall tier created successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating waterfall tier:', error);

    if (error.message && error.message.includes('chk_splits_total_100')) {
      return NextResponse.json(
        { success: false, error: 'LP and GP splits must total exactly 100%' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create waterfall tier' },
      { status: 500 }
    );
  }
}
