/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * GET /api/capitalization/equity
 * List all equity partners/tranches for a project
 *
 * Query params:
 * - projectId (required): The project ID
 *
 * Response schema translation:
 * - partner_id (DB) → tranche_id (API)
 * - ownership_pct (DB decimal 0.90) → ownership_pct (API 90)
 * - preferred_return_pct (DB decimal 0.08) → preferred_return_pct (API 8)
 * - promote_pct (DB decimal 0.20) → promote_pct (API 20)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    const partners = await sql`
      SELECT
        equity_id,
        project_id,
        equity_name,
        partner_type,
        partner_name,
        equity_class,
        ownership_pct,
        commitment_amount,
        capital_contributed,
        preferred_return_pct,
        unreturned_capital,
        cumulative_distributions,
        accrued_preferred_return,
        preferred_return_paid_to_date,
        promote_pct,
        catch_up_pct,
        promote_trigger_type,
        promote_tier_1_threshold,
        promote_tier_3_threshold,
        promote_tier_3_pct,
        irr_target_pct,
        equity_multiple_target,
        cash_on_cash_target_pct,
        distribution_frequency,
        distribution_priority,
        can_defer_distributions,
        management_fee_pct,
        management_fee_base,
        acquisition_fee_pct,
        disposition_fee_pct,
        promote_fee_pct,
        has_clawback,
        clawback_threshold_pct,
        has_lookback,
        lookback_at_sale,
        notes,
        created_at,
        updated_at
      FROM landscape.tbl_equity
      WHERE project_id = ${parseInt(projectId)}
      ORDER BY partner_type DESC, created_at ASC
    `;

    // Transform DB schema to component schema - ALL 28 fields
    const transformedPartners = partners.map((p: any) => ({
      tranche_id: Number(p.equity_id),
      project_id: Number(p.project_id),
      tranche_name: p.partner_name || p.equity_name,
      partner_type: p.partner_type || p.equity_class, // GP, LP, Sponsor, JV

      // Basic Information
      ownership_pct: p.ownership_pct ? Number(p.ownership_pct) : 0,
      capital_contributed: Number(p.capital_contributed || p.commitment_amount || 0),
      preferred_return_pct: p.preferred_return_pct ? Number(p.preferred_return_pct) : 0,

      // Capital Tracking
      unreturned_capital: p.unreturned_capital ? Number(p.unreturned_capital) : null,
      cumulative_distributions: p.cumulative_distributions ? Number(p.cumulative_distributions) : null,
      accrued_preferred_return: p.accrued_preferred_return ? Number(p.accrued_preferred_return) : null,
      preferred_return_paid_to_date: p.preferred_return_paid_to_date ? Number(p.preferred_return_paid_to_date) : null,

      // Promote Structure
      promote_pct: p.promote_pct ? Number(p.promote_pct) : null,
      catch_up_pct: p.catch_up_pct ? Number(p.catch_up_pct) : null,
      promote_trigger_type: p.promote_trigger_type || null,
      promote_tier_1_threshold: p.promote_tier_1_threshold ? Number(p.promote_tier_1_threshold) : null,
      promote_tier_3_threshold: p.promote_tier_3_threshold ? Number(p.promote_tier_3_threshold) : null,
      promote_tier_3_pct: p.promote_tier_3_pct ? Number(p.promote_tier_3_pct) : null,

      // Return Targets
      irr_target_pct: p.irr_target_pct ? Number(p.irr_target_pct) : null,
      equity_multiple_target: p.equity_multiple_target ? Number(p.equity_multiple_target) : null,
      cash_on_cash_target_pct: p.cash_on_cash_target_pct ? Number(p.cash_on_cash_target_pct) : null,

      // Distribution Terms
      distribution_frequency: p.distribution_frequency || null,
      distribution_priority: p.distribution_priority || null,
      can_defer_distributions: p.can_defer_distributions || false,

      // Fees
      management_fee_pct: p.management_fee_pct ? Number(p.management_fee_pct) : null,
      management_fee_base: p.management_fee_base || null,
      acquisition_fee_pct: p.acquisition_fee_pct ? Number(p.acquisition_fee_pct) : null,
      disposition_fee_pct: p.disposition_fee_pct ? Number(p.disposition_fee_pct) : null,
      promote_fee_pct: p.promote_fee_pct ? Number(p.promote_fee_pct) : null,

      // Clawback & Lookback
      has_clawback: p.has_clawback || false,
      clawback_threshold_pct: p.clawback_threshold_pct ? Number(p.clawback_threshold_pct) : null,
      has_lookback: p.has_lookback || false,
      lookback_at_sale: p.lookback_at_sale || false,

      // Metadata
      created_at: p.created_at,
      updated_at: p.updated_at,
    }));

    return NextResponse.json({
      success: true,
      data: transformedPartners,
    });
  } catch (error) {
    console.error('Error fetching equity partners:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch equity partners' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/capitalization/equity
 * Create a new equity partner/tranche
 *
 * Validates that total ownership across all partners = 100%
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      project_id,
      tranche_name,
      partner_type,
      ownership_pct,
      preferred_return_pct,
      capital_contributed,
      promote_pct,
      irr_target_pct,
      notes,
    } = body;

    // Validation
    if (!project_id || !tranche_name || !partner_type || ownership_pct === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: project_id, tranche_name, partner_type, ownership_pct',
        },
        { status: 400 }
      );
    }

    if (ownership_pct < 0 || ownership_pct > 100) {
      return NextResponse.json(
        { success: false, error: 'ownership_pct must be between 0 and 100' },
        { status: 400 }
      );
    }

    if (!['GP', 'LP', 'COMMON', 'PREFERRED'].includes(partner_type)) {
      return NextResponse.json(
        { success: false, error: 'partner_type must be GP, LP, COMMON, or PREFERRED' },
        { status: 400 }
      );
    }

    // Check if total ownership will exceed 100%
    const existingPartners = await sql`
      SELECT COALESCE(SUM(ownership_pct), 0) as total_ownership
      FROM landscape.tbl_equity
      WHERE project_id = ${project_id}
    `;

    const currentTotal = Number(existingPartners[0].total_ownership); // Already a percentage
    const newTotal = currentTotal + ownership_pct;

    if (newTotal > 100) {
      return NextResponse.json(
        {
          success: false,
          error: `Ownership percentages would exceed 100%. Current: ${currentTotal.toFixed(2)}%, Adding: ${ownership_pct}%, Total: ${newTotal.toFixed(2)}%`,
          details: {
            current_total: currentTotal,
            new_ownership: ownership_pct,
            new_total: newTotal,
          },
        },
        { status: 400 }
      );
    }

    // Store as percentages (0-100) - new schema
    const result = await sql`
      INSERT INTO landscape.tbl_equity (
        project_id,
        equity_name,
        partner_name,
        partner_type,
        equity_class,
        ownership_pct,
        capital_contributed,
        commitment_amount,
        preferred_return_pct,
        promote_pct,
        catch_up_pct,
        irr_target_pct,
        notes
      ) VALUES (
        ${project_id},
        ${tranche_name},
        ${tranche_name},
        ${partner_type},
        ${partner_type},
        ${ownership_pct},
        ${capital_contributed || 0},
        ${capital_contributed || 0},
        ${preferred_return_pct || 8},
        ${promote_pct},
        ${null},
        ${irr_target_pct},
        ${notes || null}
      )
      RETURNING equity_id, project_id, partner_name, ownership_pct, capital_contributed, created_at
    `;

    const newPartner = result[0];

    return NextResponse.json(
      {
        success: true,
        data: {
          tranche_id: Number(newPartner.equity_id),
          project_id: Number(newPartner.project_id),
          tranche_name: newPartner.partner_name,
          ownership_pct: Number(newPartner.ownership_pct), // Already a percentage
          capital_contributed: Number(newPartner.capital_contributed),
        },
        message: 'Equity partner created successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating equity partner:', error);

    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'Equity partner with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create equity partner' },
      { status: 500 }
    );
  }
}
