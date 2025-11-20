/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * PATCH /api/capitalization/equity/[tranche_id]
 * Update an existing equity partner/tranche
 *
 * Body schema:
 * - All fields from EquityTranche interface are optional
 * - ownership_pct validation: must remain between 0-100
 * - Total ownership across all partners must = 100%
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tranche_id: string }> }
) {
  try {
    const { tranche_id } = await params;
    const trancheId = parseInt(tranche_id);
    const body = await request.json();

    // Validation
    if (body.ownership_pct !== undefined) {
      if (body.ownership_pct < 0 || body.ownership_pct > 100) {
        return NextResponse.json(
          { success: false, error: 'ownership_pct must be between 0 and 100' },
          { status: 400 }
        );
      }

      // Check if updating ownership would break 100% rule
      const existingPartner = await sql`
        SELECT project_id, ownership_pct
        FROM landscape.tbl_equity
        WHERE equity_id = ${trancheId}
      `;

      if (existingPartner.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Equity partner not found' },
          { status: 404 }
        );
      }

      const projectId = existingPartner[0].project_id;
      const oldOwnership = Number(existingPartner[0].ownership_pct);

      // Get sum of other partners' ownership
      const otherPartners = await sql`
        SELECT COALESCE(SUM(ownership_pct), 0) as total_ownership
        FROM landscape.tbl_equity
        WHERE project_id = ${projectId}
          AND equity_id != ${trancheId}
      `;

      const otherTotal = Number(otherPartners[0].total_ownership);
      const newTotal = otherTotal + body.ownership_pct;

      if (newTotal > 100) {
        return NextResponse.json(
          {
            success: false,
            error: `Ownership percentages would exceed 100%. Other partners: ${otherTotal.toFixed(2)}%, Your update: ${body.ownership_pct}%, Total: ${newTotal.toFixed(2)}%`,
            details: {
              other_partners_total: otherTotal,
              your_new_ownership: body.ownership_pct,
              new_total: newTotal,
            },
          },
          { status: 400 }
        );
      }
    }

    // Build UPDATE query dynamically based on provided fields
    const updates: string[] = [];

    // Map of API field names to DB column names - ALL 28 fields
    const fieldMapping: Record<string, string> = {
      // Basic Information
      tranche_name: 'equity_name',
      partner_type: 'partner_type',
      ownership_pct: 'ownership_pct',
      capital_contributed: 'capital_contributed',
      preferred_return_pct: 'preferred_return_pct',

      // Capital Tracking
      unreturned_capital: 'unreturned_capital',
      cumulative_distributions: 'cumulative_distributions',
      accrued_preferred_return: 'accrued_preferred_return',
      preferred_return_paid_to_date: 'preferred_return_paid_to_date',

      // Promote Structure
      promote_pct: 'promote_pct',
      catch_up_pct: 'catch_up_pct',
      promote_trigger_type: 'promote_trigger_type',
      promote_tier_1_threshold: 'promote_tier_1_threshold',
      promote_tier_3_threshold: 'promote_tier_3_threshold',
      promote_tier_3_pct: 'promote_tier_3_pct',

      // Return Targets
      irr_target_pct: 'irr_target_pct',
      equity_multiple_target: 'equity_multiple_target',
      cash_on_cash_target_pct: 'cash_on_cash_target_pct',

      // Distribution Terms
      distribution_frequency: 'distribution_frequency',
      distribution_priority: 'distribution_priority',
      can_defer_distributions: 'can_defer_distributions',

      // Fees
      management_fee_pct: 'management_fee_pct',
      management_fee_base: 'management_fee_base',
      acquisition_fee_pct: 'acquisition_fee_pct',
      disposition_fee_pct: 'disposition_fee_pct',
      promote_fee_pct: 'promote_fee_pct',

      // Clawback & Lookback
      has_clawback: 'has_clawback',
      clawback_threshold_pct: 'clawback_threshold_pct',
      has_lookback: 'has_lookback',
      lookback_at_sale: 'lookback_at_sale',
    };

    for (const [apiField, dbField] of Object.entries(fieldMapping)) {
      if (body[apiField] !== undefined) {
        const value = body[apiField];

        // Handle different types properly
        if (value === null) {
          updates.push(`${dbField} = NULL`);
        } else if (typeof value === 'string') {
          // Escape single quotes for SQL
          updates.push(`${dbField} = '${value.replace(/'/g, "''")}'`);
        } else if (typeof value === 'boolean') {
          updates.push(`${dbField} = ${value}`);
        } else {
          // Numbers
          updates.push(`${dbField} = ${value}`);
        }
      }
    }

    // Also update partner_name to match tranche_name if provided
    if (body.tranche_name !== undefined) {
      const value = body.tranche_name;
      updates.push(`partner_name = '${value.replace(/'/g, "''")}'`);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Add updated_at
    updates.push('updated_at = NOW()');

    // Execute update using sql.raw() for dynamic SQL
    const result = await sql`
      UPDATE landscape.tbl_equity
      SET ${sql.raw(updates.join(', '))}
      WHERE equity_id = ${trancheId}
      RETURNING
        equity_id,
        project_id,
        equity_name,
        partner_type,
        partner_name,
        ownership_pct,
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
        updated_at
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Equity partner not found' },
        { status: 404 }
      );
    }

    const updatedPartner = result[0];

    // Transform to API schema - ALL 28 fields
    const transformedPartner = {
      tranche_id: Number(updatedPartner.equity_id),
      project_id: Number(updatedPartner.project_id),
      tranche_name: updatedPartner.partner_name || updatedPartner.equity_name,
      partner_type: updatedPartner.partner_type,

      // Basic Information
      ownership_pct: Number(updatedPartner.ownership_pct),
      capital_contributed: Number(updatedPartner.capital_contributed),
      preferred_return_pct: Number(updatedPartner.preferred_return_pct),

      // Capital Tracking
      unreturned_capital: updatedPartner.unreturned_capital ? Number(updatedPartner.unreturned_capital) : null,
      cumulative_distributions: updatedPartner.cumulative_distributions ? Number(updatedPartner.cumulative_distributions) : null,
      accrued_preferred_return: updatedPartner.accrued_preferred_return ? Number(updatedPartner.accrued_preferred_return) : null,
      preferred_return_paid_to_date: updatedPartner.preferred_return_paid_to_date ? Number(updatedPartner.preferred_return_paid_to_date) : null,

      // Promote Structure
      promote_pct: updatedPartner.promote_pct ? Number(updatedPartner.promote_pct) : null,
      catch_up_pct: updatedPartner.catch_up_pct ? Number(updatedPartner.catch_up_pct) : null,
      promote_trigger_type: updatedPartner.promote_trigger_type || null,
      promote_tier_1_threshold: updatedPartner.promote_tier_1_threshold ? Number(updatedPartner.promote_tier_1_threshold) : null,
      promote_tier_3_threshold: updatedPartner.promote_tier_3_threshold ? Number(updatedPartner.promote_tier_3_threshold) : null,
      promote_tier_3_pct: updatedPartner.promote_tier_3_pct ? Number(updatedPartner.promote_tier_3_pct) : null,

      // Return Targets
      irr_target_pct: updatedPartner.irr_target_pct ? Number(updatedPartner.irr_target_pct) : null,
      equity_multiple_target: updatedPartner.equity_multiple_target ? Number(updatedPartner.equity_multiple_target) : null,
      cash_on_cash_target_pct: updatedPartner.cash_on_cash_target_pct ? Number(updatedPartner.cash_on_cash_target_pct) : null,

      // Distribution Terms
      distribution_frequency: updatedPartner.distribution_frequency || null,
      distribution_priority: updatedPartner.distribution_priority || null,
      can_defer_distributions: updatedPartner.can_defer_distributions || false,

      // Fees
      management_fee_pct: updatedPartner.management_fee_pct ? Number(updatedPartner.management_fee_pct) : null,
      management_fee_base: updatedPartner.management_fee_base || null,
      acquisition_fee_pct: updatedPartner.acquisition_fee_pct ? Number(updatedPartner.acquisition_fee_pct) : null,
      disposition_fee_pct: updatedPartner.disposition_fee_pct ? Number(updatedPartner.disposition_fee_pct) : null,
      promote_fee_pct: updatedPartner.promote_fee_pct ? Number(updatedPartner.promote_fee_pct) : null,

      // Clawback & Lookback
      has_clawback: updatedPartner.has_clawback || false,
      clawback_threshold_pct: updatedPartner.clawback_threshold_pct ? Number(updatedPartner.clawback_threshold_pct) : null,
      has_lookback: updatedPartner.has_lookback || false,
      lookback_at_sale: updatedPartner.lookback_at_sale || false,

      // Metadata
      updated_at: updatedPartner.updated_at,
    };

    return NextResponse.json({
      success: true,
      data: transformedPartner,
      message: 'Equity partner updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating equity partner:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update equity partner' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/capitalization/equity/[tranche_id]
 * Delete an equity partner/tranche
 *
 * Cascade behavior:
 * - Will delete associated distribution records
 * - Will NOT delete if this would break ownership = 100% rule
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tranche_id: string }> }
) {
  try {
    const { tranche_id } = await params;
    const trancheId = parseInt(tranche_id);

    // Check if partner exists and get project info
    const existingPartner = await sql`
      SELECT project_id, equity_name, partner_name, ownership_pct
      FROM landscape.tbl_equity
      WHERE equity_id = ${trancheId}
    `;

    if (existingPartner.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Equity partner not found' },
        { status: 404 }
      );
    }

    const partner = existingPartner[0];
    const projectId = partner.project_id;

    // Check if deleting this partner would leave the project with valid ownership
    const otherPartners = await sql`
      SELECT COALESCE(SUM(ownership_pct), 0) as total_ownership
      FROM landscape.tbl_equity
      WHERE project_id = ${projectId}
        AND equity_id != ${trancheId}
    `;

    const remainingOwnership = Number(otherPartners[0].total_ownership);

    // Only warn if there are other partners but they don't sum to 100%
    // (Allow deletion if this is the last partner)
    if (remainingOwnership > 0 && Math.abs(remainingOwnership - 100) > 0.01) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete: Remaining partners would have ${remainingOwnership.toFixed(2)}% ownership (must be 100%)`,
          details: {
            current_ownership: Number(partner.ownership_pct),
            remaining_after_delete: remainingOwnership,
          },
        },
        { status: 400 }
      );
    }

    // Delete the partner
    const result = await sql`
      DELETE FROM landscape.tbl_equity
      WHERE equity_id = ${trancheId}
      RETURNING equity_id, equity_name, partner_name
    `;

    return NextResponse.json({
      success: true,
      data: {
        deleted_id: Number(result[0].equity_id),
        deleted_name: result[0].partner_name || result[0].equity_name,
      },
      message: 'Equity partner deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting equity partner:', error);

    // Check for foreign key constraint violations
    if (error.code === '23503') {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete: This partner has associated distribution records',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to delete equity partner' },
      { status: 500 }
    );
  }
}
