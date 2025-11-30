import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type PicklistTypeRow = {
  picklist_type: string;
  item_count: number;
  has_parent: boolean;
};

export async function GET() {
  try {
    const rows = await sql<PicklistTypeRow[]>`
      SELECT
        picklist_type,
        COUNT(*) AS item_count,
        BOOL_OR(parent_id IS NOT NULL) AS has_parent
      FROM landscape.tbl_system_picklist
      GROUP BY picklist_type
      ORDER BY picklist_type;
    `;

    return NextResponse.json({
      types: rows.map((row) => ({
        type: row.picklist_type,
        count: Number(row.item_count) || 0,
        hasParent: Boolean(row.has_parent),
      })),
    });
  } catch (err) {
    console.error('picklists root GET error', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'Failed to load picklist types', details: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const picklistTypeRaw = body?.picklist_type;
    const codeRaw = body?.code;
    const nameRaw = body?.name;

    if (!picklistTypeRaw || !codeRaw || !nameRaw) {
      return NextResponse.json({ error: 'picklist_type, code, and name are required' }, { status: 400 });
    }

    const picklistType = String(picklistTypeRaw).toUpperCase().replace(/-/g, '_');
    const code = String(codeRaw).toUpperCase();
    const name = String(nameRaw);
    const description = body?.description ? String(body.description) : null;
    const parentId = body?.parent_id ? Number(body.parent_id) : null;

    const sortOrderRow = await sql<{ next_order: number }[]>`
      SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order
      FROM landscape.tbl_system_picklist
      WHERE picklist_type = ${picklistType};
    `;
    const sortOrder = body?.sort_order ?? sortOrderRow[0]?.next_order ?? 0;

    const existing = await sql`
      SELECT 1 FROM landscape.tbl_system_picklist
      WHERE picklist_type = ${picklistType} AND code = ${code}
      LIMIT 1;
    `;
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Code already exists for this picklist type' }, { status: 400 });
    }

    const inserted = await sql`
      INSERT INTO landscape.tbl_system_picklist
        (picklist_type, code, name, description, parent_id, sort_order)
      VALUES
        (${picklistType}, ${code}, ${name}, ${description}, ${parentId}, ${sortOrder})
      RETURNING *;
    `;

    return NextResponse.json({ value: inserted[0] }, { status: 201 });
  } catch (err) {
    console.error('picklists root POST error', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'Failed to create picklist value', details: message }, { status: 500 });
  }
}
