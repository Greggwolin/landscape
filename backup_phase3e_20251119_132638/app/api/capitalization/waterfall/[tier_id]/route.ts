/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tier_id: string }> }
) {
  try {
    const { tier_id } = await params;
    const tierId = parseInt(tier_id);
    const body = await request.json();

    // Build the SET clause dynamically - ALL 9 fields
    const updates: string[] = [];
    const fieldMapping: Record<string, string> = {
      tier_number: 'tier_number',
      tier_name: 'tier_name',
      irr_threshold_pct: 'irr_threshold_pct',
      equity_multiple_threshold: 'equity_multiple_threshold',
      lp_split_pct: 'lp_split_pct',
      gp_split_pct: 'gp_split_pct',
      is_pari_passu: 'is_pari_passu',
      is_lookback_tier: 'is_lookback_tier',
      catch_up_to_pct: 'catch_up_to_pct',
      is_active: 'is_active',
      display_order: 'display_order',
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

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Validate splits sum to 100
    if (body.lp_split_pct !== undefined || body.gp_split_pct !== undefined) {
      const lpSplit = body.lp_split_pct;
      const gpSplit = body.gp_split_pct;

      if (lpSplit !== undefined && gpSplit !== undefined) {
        if (Math.abs(lpSplit + gpSplit - 100) > 0.01) {
          return NextResponse.json(
            { success: false, error: 'LP and GP splits must sum to 100%' },
            { status: 400 }
          );
        }
      }
    }

    updates.push('updated_at = NOW()');

    const result = await sql`
      UPDATE landscape.tbl_waterfall_tier
      SET ${sql.raw(updates.join(', '))}
      WHERE tier_id = ${tierId}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Waterfall tier not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error: any) {
    console.error('Error updating waterfall tier:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update waterfall tier' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tier_id: string }> }
) {
  try {
    const { tier_id } = await params;
    const tierId = parseInt(tier_id);

    const result = await sql`
      DELETE FROM landscape.tbl_waterfall_tier
      WHERE tier_id = ${tierId}
      RETURNING tier_id, tier_name
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Waterfall tier not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error: any) {
    console.error('Error deleting waterfall tier:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete waterfall tier' },
      { status: 500 }
    );
  }
}
