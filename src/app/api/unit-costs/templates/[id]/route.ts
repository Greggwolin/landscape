import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  allowedTemplateFields,
  coerceDecimal,
  coerceInteger,
  mapTemplateRow,
  normalizeTemplatePayload,
  templateSelectFields,
  TemplateRow
} from '../helpers';

const DJANGO_API_URL = process.env.DJANGO_API_URL;

type Params = { params: Promise<{ id: string }> };

async function fetchTemplateViaDjango(id: string) {
  if (!DJANGO_API_URL) return null;

  try {
    const response = await fetch(
      `${DJANGO_API_URL.replace(/\/$/, '')}/api/financial/unit-costs/templates/${id}/`,
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error('Failed to fetch template via Django:', response.status, text);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn('Django template detail endpoint unreachable, falling back to SQL:', error);
    return null;
  }
}

async function getTemplateById(id: number) {
  const query = `
    SELECT ${templateSelectFields}
    FROM landscape.core_unit_cost_template t
    JOIN landscape.core_unit_cost_category c ON c.category_id = t.category_id
    WHERE t.template_id = $1
    LIMIT 1;
  `;

  const result = await sql.query<TemplateRow>(query, [id]);
  const row = result?.[0];
  return row ? mapTemplateRow(row) : null;
}

async function updateTemplateDirect(id: number, body: Record<string, unknown>) {
  const payload = normalizeTemplatePayload(body);
  const values = [
    payload.category_id,
    payload.item_name,
    payload.default_uom_code,
    payload.typical_mid_value,
    payload.quantity,
    payload.market_geography,
    payload.source,
    payload.as_of_date,
    payload.project_type_code,
    payload.usage_count ?? 0,
    payload.last_used_date,
    payload.is_active,
    payload.created_from_project_id,
    payload.created_from_ai,
    id
  ];

  const updateQuery = `
    UPDATE landscape.core_unit_cost_template
    SET
      category_id = $1,
      item_name = $2,
      default_uom_code = $3,
      typical_mid_value = $4,
      quantity = $5,
      market_geography = $6,
      source = $7,
      as_of_date = $8,
      project_type_code = $9,
      usage_count = $10,
      last_used_date = $11,
      is_active = $12,
      created_from_project_id = $13,
      created_from_ai = $14,
      updated_at = NOW()
    WHERE template_id = $15
    RETURNING template_id;
  `;

  const updateResult = await sql.query<{ template_id: number }>(updateQuery, values);
  if (!updateResult || updateResult.length === 0) {
    throw new Error('Template not found');
  }

  // Fetch the updated template with all fields including category_name
  const selectQuery = `
    SELECT ${templateSelectFields}
    FROM landscape.core_unit_cost_template t
    JOIN landscape.core_unit_cost_category c ON c.category_id = t.category_id
    WHERE t.template_id = $1
    LIMIT 1;
  `;

  const result = await sql.query<TemplateRow>(selectQuery, [id]);
  const row = result?.[0];
  if (!row) {
    throw new Error('Template not found after update');
  }
  return mapTemplateRow(row);
}

async function patchTemplateDirect(id: number, body: Record<string, unknown>) {
  const updates: string[] = [];
  const values: Array<string | number | null | boolean> = [];

  for (const [key, raw] of Object.entries(body)) {
    if (!allowedTemplateFields.has(key)) continue;

    let value: string | number | null | boolean = raw as string | number | null | boolean;

    switch (key) {
      case 'category_id': {
        const coerced = coerceInteger(raw);
        if (!coerced) throw new Error('category_id must be a number');
        value = coerced;
        break;
      }
      case 'item_name': {
        if (typeof raw !== 'string' || !raw.trim()) {
          throw new Error('item_name must be a non-empty string');
        }
        value = raw.trim();
        break;
      }
      case 'default_uom_code': {
        if (typeof raw !== 'string' || !raw.trim()) {
          throw new Error('default_uom_code must be provided');
        }
        value = raw.trim().toUpperCase();
        break;
      }
      case 'typical_mid_value':
        value = coerceDecimal(raw);
        break;
      case 'quantity':
        value = coerceDecimal(raw);
        break;
      case 'market_geography':
        value = typeof raw === 'string' ? raw.trim() || null : null;
        break;
      case 'source':
        value = typeof raw === 'string' ? raw.trim() || null : null;
        break;
      case 'as_of_date':
        value = typeof raw === 'string' ? raw.trim() || null : null;
        break;
      case 'project_type_code': {
        if (typeof raw !== 'string' || !raw.trim()) {
          throw new Error('project_type_code must be a non-empty string');
        }
        value = raw.trim().toUpperCase();
        break;
      }
      case 'usage_count':
        value = coerceInteger(raw) ?? 0;
        break;
      case 'last_used_date':
        value = typeof raw === 'string' ? raw : null;
        break;
      case 'is_active':
        value = Boolean(raw);
        break;
      case 'created_from_project_id':
        value = coerceInteger(raw);
        break;
      default:
        break;
    }

    values.push(value);
    updates.push(`${key} = $${values.length}`);
  }

  if (updates.length === 0) {
    throw new Error('No valid fields provided for update');
  }

  values.push(id);
  const updateQuery = `
    UPDATE landscape.core_unit_cost_template
    SET ${updates.join(', ')}, updated_at = NOW()
    WHERE template_id = $${values.length}
    RETURNING template_id;
  `;

  const updateResult = await sql.query<{ template_id: number }>(updateQuery, values);
  if (!updateResult || updateResult.length === 0) {
    throw new Error('Template not found');
  }

  // Fetch the updated template with all fields including category_name
  const selectQuery = `
    SELECT ${templateSelectFields}
    FROM landscape.core_unit_cost_template t
    JOIN landscape.core_unit_cost_category c ON c.category_id = t.category_id
    WHERE t.template_id = $1
    LIMIT 1;
  `;

  const result = await sql.query<TemplateRow>(selectQuery, [id]);
  const row = result?.[0];
  if (!row) {
    throw new Error('Template not found after update');
  }
  return mapTemplateRow(row);
}

async function softDeleteTemplate(id: number) {
  const updateQuery = `
    UPDATE landscape.core_unit_cost_template
    SET is_active = false, updated_at = NOW()
    WHERE template_id = $1
    RETURNING template_id;
  `;

  const updateResult = await sql.query<{ template_id: number }>(updateQuery, [id]);
  if (!updateResult || updateResult.length === 0) {
    throw new Error('Template not found');
  }

  // Fetch the updated template with all fields including category_name
  const selectQuery = `
    SELECT ${templateSelectFields}
    FROM landscape.core_unit_cost_template t
    JOIN landscape.core_unit_cost_category c ON c.category_id = t.category_id
    WHERE t.template_id = $1
    LIMIT 1;
  `;

  const result = await sql.query<TemplateRow>(selectQuery, [id]);
  const row = result?.[0];
  if (!row) {
    throw new Error('Template not found after soft delete');
  }
  return mapTemplateRow(row);
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const djangoPayload = await fetchTemplateViaDjango(id);
  if (djangoPayload) {
    return NextResponse.json(djangoPayload);
  }

  const templateId = Number(id);
  if (!Number.isFinite(templateId)) {
    return NextResponse.json({ error: 'Invalid template id' }, { status: 400 });
  }

  try {
    const template = await getTemplateById(templateId);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    return NextResponse.json(template);
  } catch (error) {
    console.error('Direct SQL error fetching template:', error);
    return NextResponse.json(
      {
        error: 'Unexpected error fetching unit cost template',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  if (DJANGO_API_URL) {
    try {
      const response = await fetch(
        `${DJANGO_API_URL.replace(/\/$/, '')}/api/financial/unit-costs/templates/${id}/`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
      );

      if (response.ok) {
        const payload = await response.json();
        return NextResponse.json(payload);
      }

      const text = await response.text();
      console.error('Failed to PUT template via Django:', response.status, text);
      if (response.status !== 404 && response.status !== 502) {
        return NextResponse.json(
          { error: 'Failed to update template', details: text },
          { status: response.status }
        );
      }
    } catch (error) {
      console.warn('Django PUT unavailable, using SQL fallback:', error);
    }
  }

  const templateId = Number(id);
  if (!Number.isFinite(templateId)) {
    return NextResponse.json({ error: 'Invalid template id' }, { status: 400 });
  }

  try {
    const updated = await updateTemplateDirect(templateId, body as Record<string, unknown>);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Direct SQL error updating template:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unexpected error updating template'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  if (DJANGO_API_URL) {
    try {
      const response = await fetch(
        `${DJANGO_API_URL.replace(/\/$/, '')}/api/financial/unit-costs/templates/${id}/`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
      );

      if (response.ok) {
        const payload = await response.json();
        return NextResponse.json(payload);
      }

      const text = await response.text();
      console.error('Failed to PATCH template via Django:', response.status, text);
      if (response.status !== 404 && response.status !== 502) {
        return NextResponse.json(
          { error: 'Failed to update template', details: text },
          { status: response.status }
        );
      }
    } catch (error) {
      console.warn('Django PATCH unavailable, using SQL fallback:', error);
    }
  }

  const templateId = Number(id);
  if (!Number.isFinite(templateId)) {
    return NextResponse.json({ error: 'Invalid template id' }, { status: 400 });
  }

  try {
    const updated = await patchTemplateDirect(templateId, body as Record<string, unknown>);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Direct SQL error patching template:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unexpected error updating template'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  if (DJANGO_API_URL) {
    try {
      const response = await fetch(
        `${DJANGO_API_URL.replace(/\/$/, '')}/api/financial/unit-costs/templates/${id}/`,
        { method: 'DELETE', headers: { 'Content-Type': 'application/json' } }
      );

      if (response.ok) {
        return NextResponse.json({}, { status: 204 });
      }

      const text = await response.text();
      console.error('Failed to DELETE template via Django:', response.status, text);
      if (response.status !== 404 && response.status !== 502) {
        return NextResponse.json(
          { error: 'Failed to delete template', details: text },
          { status: response.status }
        );
      }
    } catch (error) {
      console.warn('Django DELETE unavailable, using SQL fallback:', error);
    }
  }

  const templateId = Number(id);
  if (!Number.isFinite(templateId)) {
    return NextResponse.json({ error: 'Invalid template id' }, { status: 400 });
  }

  try {
    await softDeleteTemplate(templateId);
    return NextResponse.json({}, { status: 204 });
  } catch (error) {
    console.error('Direct SQL error deleting template:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unexpected error deleting template'
      },
      { status: 500 }
    );
  }
}
