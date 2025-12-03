import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const codes: string[] = Array.isArray(body?.uom_codes) ? body.uom_codes : [];

    if (codes.length === 0) {
      return NextResponse.json({ success: false, error: 'uom_codes array is required' }, { status: 400 });
    }

    const normalized = codes.map((c) => String(c).trim().toUpperCase()).filter(Boolean);
    const unique = Array.from(new Set(normalized));
    if (unique.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid UOM codes provided' }, { status: 400 });
    }

    // Update sort_order using unnest
    await sql`
      WITH ordered AS (
        SELECT code, ord
        FROM UNNEST(${unique}::text[]) WITH ORDINALITY AS t(code, ord)
      )
      UPDATE landscape.tbl_measures m
      SET sort_order = o.ord
      FROM ordered o
      WHERE UPPER(m.measure_code) = UPPER(o.code);
    `;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('UOM reorder error', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: 'Failed to reorder UOMs', details: message }, { status: 500 });
  }
}
