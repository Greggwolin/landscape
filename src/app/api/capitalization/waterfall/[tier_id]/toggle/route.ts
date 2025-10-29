/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type Params = { params: Promise<{ tier_id: string }> };

/**
 * PATCH /api/capitalization/waterfall/[tier_id]/toggle
 * Toggle the active status of a waterfall tier
 *
 * Note: The DB schema doesn't have an is_active field
 * This endpoint is provided for component compatibility but has no effect on the DB
 * All waterfall tiers are considered active
 */
export async function PATCH(request: NextRequest, context: Params) {
  try {
    const { tier_id } = await context.params;
    const tierId = parseInt(tier_id);

    // Check if tier exists
    const existing = await sql`
      SELECT tier_id, tier_description
      FROM landscape.tbl_waterfall_tier
      WHERE tier_id = ${tierId}
    `;

    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Waterfall tier not found' },
        { status: 404 }
      );
    }

    // Since DB doesn't have is_active field, we just return success
    // Future enhancement: Add is_active column to tbl_waterfall_tier
    return NextResponse.json({
      success: true,
      data: {
        tier_id: tierId,
        tier_name: existing[0].tier_description,
        is_active: true, // Always true since DB doesn't track this
      },
      message: 'Note: Active status toggling not yet implemented in database schema. All tiers are active.',
    });
  } catch (error) {
    console.error('Error toggling waterfall tier status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to toggle waterfall tier status' },
      { status: 500 }
    );
  }
}
