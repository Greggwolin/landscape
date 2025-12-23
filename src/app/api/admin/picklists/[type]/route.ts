import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const normalizeType = (type: string) => type.toUpperCase().replace(/-/g, '_');

type Params = { params: Promise<{ type: string }> };

export async function GET(_request: NextRequest, context: Params) {
  try {
    const { type } = await context.params;
    const picklistType = normalizeType(type);

    const rows = await sql`
      SELECT
        p.picklist_id,
        p.picklist_type,
        p.code,
        p.name,
        p.description,
        p.parent_id,
        parent.code AS parent_code,
        parent.name AS parent_name,
        p.sort_order,
        p.is_active,
        p.created_at,
        p.updated_at
      FROM landscape.tbl_system_picklist p
      LEFT JOIN landscape.tbl_system_picklist parent ON p.parent_id = parent.picklist_id
      WHERE p.picklist_type = ${picklistType}
      ORDER BY p.sort_order, p.name;
    `;

    return NextResponse.json({ values: rows });
  } catch (err) {
    console.error('picklists type GET error', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'Failed to load picklist values', details: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: Params) {
  try {
    const { type } = await context.params;
    const picklistType = normalizeType(type);
    const body = await request.json();
    const codeRaw = body?.code;
    const nameRaw = body?.name;
    if (!codeRaw || !nameRaw) {
      return NextResponse.json({ error: 'code and name are required' }, { status: 400 });
    }

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
    console.error('picklists type POST error', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'Failed to create picklist value', details: message }, { status: 500 });
  }
}
