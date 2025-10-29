/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ draw_id: string }> }
) {
  try {
    const { draw_id } = await params;
    const drawId = parseInt(draw_id);
    const body = await request.json();

    // Build the SET clause dynamically
    const updates: string[] = [];
    const fieldMapping: Record<string, string> = {
      draw_amount: 'draw_amount',
      draw_date: 'draw_date',
      draw_purpose: 'draw_purpose',
      draw_status: 'draw_status',
    };

    for (const [apiField, dbField] of Object.entries(fieldMapping)) {
      if (body[apiField] !== undefined) {
        const value = body[apiField];
        // Handle string values that need quotes
        if (typeof value === 'string') {
          updates.push(`${dbField} = '${value.replace(/'/g, "''")}'`);
        } else {
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

    const result = await sql`
      UPDATE landscape.tbl_debt_draw_schedule
      SET ${sql.raw(updates.join(', '))}
      WHERE draw_id = ${drawId}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Draw schedule item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error: any) {
    console.error('Error updating draw schedule:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update draw schedule' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ draw_id: string }> }
) {
  try {
    const { draw_id } = await params;
    const drawId = parseInt(draw_id);

    const result = await sql`
      DELETE FROM landscape.tbl_debt_draw_schedule
      WHERE draw_id = ${drawId}
      RETURNING draw_id, draw_purpose
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Draw schedule item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error: any) {
    console.error('Error deleting draw schedule:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete draw schedule' },
      { status: 500 }
    );
  }
}
