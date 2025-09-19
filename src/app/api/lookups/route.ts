// Next.js App Router API Route
// File: src/app/api/lookups/route.ts
// Version: v1.4 (2025-09-07)
// Purpose: Serve lookup lists from landscape.core_lookup_vw to UI dropdowns

import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyParam = searchParams.get('key');

    if (!keyParam) {
      const rows = await sql`
        SELECT DISTINCT list_key
        FROM landscape.core_lookup_vw
        ORDER BY list_key;
      `;
      const listRows = rows as unknown as { list_key: string }[]
      return NextResponse.json({ keys: listRows.map((r) => r.list_key) });
    }

    const keys = keyParam.split(',').map((k) => k.trim()).filter(Boolean);
    if (keys.length === 0) return NextResponse.json({}, { status: 200 });

    const rows = await sql`
      SELECT list_key, sort_order, code, label, item_id
      FROM landscape.core_lookup_vw
      WHERE list_key = ANY(${keys})
      ORDER BY list_key, sort_order, item_id;
    `;

    const result: Record<string, { code: string; label: string; sort_order: number }[]> = {};
    for (const r of rows as unknown as { list_key: string; sort_order: number; code: string; label: string; item_id: number }[]) {
      if (!result[r.list_key]) result[r.list_key] = [];
      result[r.list_key].push({ code: r.code, label: r.label, sort_order: r.sort_order });
    }
    for (const k of keys) if (!result[k]) result[k] = [];

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Lookups API error:', err);
    return NextResponse.json(
      { error: 'Failed to load lookup lists', details: msg },
      { status: 500 }
    );
  }
}
