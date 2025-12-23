import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const normalizeType = (type: string) => type.toUpperCase().replace(/-/g, '_');

type Params = { params: Promise<{ type: string; id: string }> };

export async function PUT(request: NextRequest, context: Params) {
  try {
    const { type, id } = await context.params;
    const picklistType = normalizeType(type);
    const picklistId = Number(id);
    if (!Number.isFinite(picklistId)) {
      return NextResponse.json({ error: 'Invalid picklist id' }, { status: 400 });
    }

    const body = await request.json();
    const sets: string[] = [];
    const values: unknown[] = [];

    const pushField = (field: string, value: unknown) => {
      sets.push(`${field} = $${sets.length + 1}`);
      values.push(value);
    };

    if (body.name !== undefined) pushField('name', String(body.name));
    if (body.description !== undefined) pushField('description', body.description === null ? null : String(body.description));
    if (body.sort_order !== undefined) pushField('sort_order', Number(body.sort_order));
    if (body.is_active !== undefined) pushField('is_active', Boolean(body.is_active));
    if (body.parent_id !== undefined) pushField('parent_id', body.parent_id === null ? null : Number(body.parent_id));

    if (sets.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // picklist_id and picklist_type placeholders
    const picklistIdIndex = sets.length + 1;
    const picklistTypeIndex = sets.length + 2;

    const query = `
      UPDATE landscape.tbl_system_picklist
      SET ${sets.join(', ')}
      WHERE picklist_id = $${picklistIdIndex} AND picklist_type = $${picklistTypeIndex}
      RETURNING *;
    `;

    const updated = await sql.query(query, [...values, picklistId, picklistType]);

    if (!updated?.rows || updated.rows.length === 0) {
      return NextResponse.json({ error: 'Picklist value not found' }, { status: 404 });
    }

    return NextResponse.json({ value: updated.rows[0] });
  } catch (err) {
    console.error('picklists item PUT error', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'Failed to update picklist value', details: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: Params) {
  try {
    const { type, id } = await context.params;
    const picklistType = normalizeType(type);
    const picklistId = Number(id);
    if (!Number.isFinite(picklistId)) {
      return NextResponse.json({ error: 'Invalid picklist id' }, { status: 400 });
    }

    const updated = await sql`
      UPDATE landscape.tbl_system_picklist
      SET is_active = FALSE
      WHERE picklist_id = ${picklistId} AND picklist_type = ${picklistType}
      RETURNING *;
    `;

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Picklist value not found' }, { status: 404 });
    }

    return NextResponse.json({ value: updated[0] });
  } catch (err) {
    console.error('picklists item DELETE error', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'Failed to delete picklist value', details: message }, { status: 500 });
  }
}
