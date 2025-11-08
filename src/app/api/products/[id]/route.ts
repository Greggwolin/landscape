import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  computeDensity,
  fetchPlanningEfficiency,
  getProductByIdDirect,
  mapProductRow,
  ProductRow
} from '../helpers';

const DJANGO_API_URL = process.env.DJANGO_API_URL;

type Params = { params: Promise<{ id: string }> };

async function fetchProductViaDjango(id: string) {
  if (!DJANGO_API_URL) return null;

  try {
    const response = await fetch(`${DJANGO_API_URL.replace(/\/$/, '')}/api/landuse/products/${id}/`, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Failed to fetch product via Django:', response.status, text);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn('Django product detail endpoint unreachable, using SQL fallback:', error);
    return null;
  }
}

const normalizeProductPayload = (body: Record<string, unknown>) => {
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  const lotW = Number(body.lot_w_ft ?? body.lotWidth);
  const lotD = Number(body.lot_d_ft ?? body.lotDepth);

  if (!code) throw new Error('Code is required');
  if (!Number.isFinite(lotW) || lotW <= 0 || !Number.isFinite(lotD) || lotD <= 0) {
    throw new Error('Lot width and depth must be greater than 0');
  }

  const typeField = body.type_id ?? body.typeId;
  const isActiveField = body.is_active ?? body.isActive;

  return {
    code,
    lot_w_ft: lotW,
    lot_d_ft: lotD,
    lot_area_sf: lotW * lotD,
    type_id: typeField !== undefined && typeField !== null ? Number(typeField) : null,
    is_active: isActiveField === undefined ? true : Boolean(isActiveField)
  };
};

async function updateProductDirect(id: number, body: Record<string, unknown>) {
  const payload = normalizeProductPayload(body);

  const result = await sql.query<ProductRow>(
    `
      UPDATE landscape.res_lot_product
      SET
        code = $1,
        lot_w_ft = $2,
        lot_d_ft = $3,
        lot_area_sf = $4,
        type_id = $5,
        is_active = $6,
        updated_at = NOW()
      WHERE product_id = $7
      RETURNING
        product_id,
        code,
        lot_w_ft,
        lot_d_ft,
        lot_area_sf,
        type_id,
        NULL::text AS type_name,
        is_active,
        created_at,
        updated_at;
    `,
    [
      payload.code,
      payload.lot_w_ft,
      payload.lot_d_ft,
      payload.lot_area_sf,
      payload.type_id,
      payload.is_active,
      id
    ]
  );

  const row = result.rows?.[0];
  if (!row) throw new Error('Product not found');
  return (await getProductByIdDirect(id)) ?? mapProductRow(row);
}

async function patchProductDirect(id: number, body: Record<string, unknown>) {
  const current = await getProductByIdDirect(id);
  if (!current) throw new Error('Product not found');

  const updates: string[] = [];
  const values: Array<string | number | boolean | null> = [];

  let lotWidth = current.lot_w_ft ?? null;
  let lotDepth = current.lot_d_ft ?? null;
  let widthChanged = false;
  let depthChanged = false;

  for (const [key, raw] of Object.entries(body)) {
    switch (key) {
      case 'code': {
        if (typeof raw !== 'string' || !raw.trim()) {
          throw new Error('Code must be a non-empty string');
        }
        values.push(raw.trim());
        updates.push(`code = $${values.length}`);
        break;
      }
      case 'lot_w_ft':
      case 'lotWidth': {
        const value = Number(raw);
        if (!Number.isFinite(value) || value <= 0) {
          throw new Error('lot_w_ft must be greater than 0');
        }
        lotWidth = value;
        widthChanged = true;
        values.push(value);
        updates.push(`lot_w_ft = $${values.length}`);
        break;
      }
      case 'lot_d_ft':
      case 'lotDepth': {
        const value = Number(raw);
        if (!Number.isFinite(value) || value <= 0) {
          throw new Error('lot_d_ft must be greater than 0');
        }
        lotDepth = value;
        depthChanged = true;
        values.push(value);
        updates.push(`lot_d_ft = $${values.length}`);
        break;
      }
      case 'type_id':
      case 'typeId': {
        const value = raw === null || raw === undefined ? null : Number(raw);
        values.push(value);
        updates.push(`type_id = $${values.length}`);
        break;
      }
      case 'is_active':
      case 'isActive': {
        values.push(Boolean(raw));
        updates.push(`is_active = $${values.length}`);
        break;
      }
      default:
        break;
    }
  }

  if (widthChanged || depthChanged) {
    const area = lotWidth && lotDepth ? lotWidth * lotDepth : null;
    values.push(area);
    updates.push(`lot_area_sf = $${values.length}`);
  }

  if (updates.length === 0) {
    throw new Error('No valid fields provided for update');
  }

  values.push(id);
  const result = await sql.query<ProductRow>(
    `
      UPDATE landscape.res_lot_product
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE product_id = $${values.length}
      RETURNING
        product_id,
        code,
        lot_w_ft,
        lot_d_ft,
        lot_area_sf,
        type_id,
        NULL::text AS type_name,
        is_active,
        created_at,
        updated_at;
    `,
    values
  );

  const row = result.rows?.[0];
  if (!row) throw new Error('Product not found');
  return (await getProductByIdDirect(id)) ?? mapProductRow(row);
}

async function softDeleteProduct(id: number) {
  await sql.query(
    `UPDATE landscape.res_lot_product SET is_active = false, updated_at = NOW() WHERE product_id = $1`,
    [id]
  );
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const djangoPayload = await fetchProductViaDjango(id);
  if (djangoPayload) {
    return NextResponse.json(djangoPayload);
  }

  const productId = Number(id);
  if (!Number.isFinite(productId)) {
    return NextResponse.json({ error: 'Invalid product id' }, { status: 400 });
  }

  try {
    const product = await getProductByIdDirect(productId);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    const efficiency = await fetchPlanningEfficiency();
    return NextResponse.json({
      ...product,
      density_per_acre: computeDensity(product, efficiency)
    });
  } catch (error) {
    console.error('Direct SQL error fetching product detail:', error);
    return NextResponse.json(
      {
        error: 'Unexpected error fetching product detail',
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
      const response = await fetch(`${DJANGO_API_URL.replace(/\/$/, '')}/api/landuse/products/${id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        return NextResponse.json(await response.json());
      }

      const text = await response.text();
      console.error('Failed to PUT product via Django:', response.status, text);
      if (response.status !== 404 && response.status !== 502) {
        return NextResponse.json(
          { error: 'Failed to update product', details: text },
          { status: response.status }
        );
      }
    } catch (error) {
      console.warn('Django product PUT unavailable, using SQL fallback:', error);
    }
  }

  const productId = Number(id);
  if (!Number.isFinite(productId)) {
    return NextResponse.json({ error: 'Invalid product id' }, { status: 400 });
  }

  try {
    const updated = await updateProductDirect(productId, body as Record<string, unknown>);
    const efficiency = await fetchPlanningEfficiency();
    return NextResponse.json({
      ...updated,
      density_per_acre: computeDensity(updated, efficiency)
    });
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Product code already exists' }, { status: 409 });
    }

    console.error('Direct SQL error updating product:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unexpected error updating product'
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
      const response = await fetch(`${DJANGO_API_URL.replace(/\/$/, '')}/api/landuse/products/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        return NextResponse.json(await response.json());
      }

      const text = await response.text();
      console.error('Failed to PATCH product via Django:', response.status, text);
      if (response.status !== 404 && response.status !== 502) {
        return NextResponse.json(
          { error: 'Failed to update product', details: text },
          { status: response.status }
        );
      }
    } catch (error) {
      console.warn('Django product PATCH unavailable, using SQL fallback:', error);
    }
  }

  const productId = Number(id);
  if (!Number.isFinite(productId)) {
    return NextResponse.json({ error: 'Invalid product id' }, { status: 400 });
  }

  try {
    const updated = await patchProductDirect(productId, body as Record<string, unknown>);
    const efficiency = await fetchPlanningEfficiency();
    return NextResponse.json({
      ...updated,
      density_per_acre: computeDensity(updated, efficiency)
    });
  } catch (error) {
    console.error('Direct SQL error patching product:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unexpected error updating product'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  if (DJANGO_API_URL) {
    try {
      const response = await fetch(`${DJANGO_API_URL.replace(/\/$/, '')}/api/landuse/products/${id}/`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        return NextResponse.json({}, { status: 204 });
      }

      const text = await response.text();
      console.error('Failed to DELETE product via Django:', response.status, text);
      if (response.status !== 404 && response.status !== 502) {
        return NextResponse.json(
          { error: 'Failed to delete product', details: text },
          { status: response.status }
        );
      }
    } catch (error) {
      console.warn('Django product DELETE unavailable, using SQL fallback:', error);
    }
  }

  const productId = Number(id);
  if (!Number.isFinite(productId)) {
    return NextResponse.json({ error: 'Invalid product id' }, { status: 400 });
  }

  try {
    await softDeleteProduct(productId);
    return NextResponse.json({}, { status: 204 });
  } catch (error) {
    console.error('Direct SQL error deleting product:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unexpected error deleting product'
      },
      { status: 500 }
    );
  }
}
