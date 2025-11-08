import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { computeDensity, fetchPlanningEfficiency, getProductByIdDirect, mapProductRow, ProductRow } from './helpers';

const DJANGO_API_URL = process.env.DJANGO_API_URL;

async function queryProducts(searchParams: URLSearchParams) {
  const activeOnly = searchParams.get('active_only') !== 'false';
  const typeId = searchParams.get('type_id');
  const search = searchParams.get('search');

  const whereParts: string[] = ['1=1'];
  const values: Array<string | number> = [];

  if (activeOnly) {
    whereParts.push('p.is_active = true');
  }

  if (typeId) {
    values.push(Number(typeId));
    whereParts.push(`p.type_id = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    whereParts.push(`p.code ILIKE $${values.length}`);
  }

  const query = `
    SELECT
      p.product_id,
      p.code,
      p.lot_w_ft,
      p.lot_d_ft,
      p.lot_area_sf,
      p.type_id,
      t.name AS type_name,
      p.is_active,
      p.created_at,
      p.updated_at
    FROM landscape.res_lot_product p
    LEFT JOIN landscape.lu_type t ON t.type_id = p.type_id
    WHERE ${whereParts.join(' AND ')}
    ORDER BY p.code;
  `;

  const result = await sql.query<ProductRow>(query, values);
  return result.rows ?? [];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  if (DJANGO_API_URL) {
    try {
      const url = new URL(`${DJANGO_API_URL.replace(/\/$/, '')}/api/landuse/products/`);
      searchParams.forEach((value, key) => {
        if (value !== null) {
          url.searchParams.set(key, value);
        }
      });

      const response = await fetch(url.toString(), { headers: { 'Content-Type': 'application/json' } });
      if (response.ok) {
        return NextResponse.json(await response.json());
      }

      const text = await response.text();
      console.error('Failed to fetch products via Django:', response.status, text);
      if (response.status !== 404 && response.status !== 502) {
        return NextResponse.json(
          { error: 'Failed to fetch products', details: text },
          { status: response.status }
        );
      }
    } catch (error) {
      console.warn('Django products endpoint unreachable, using SQL fallback:', error);
    }
  }

  try {
    const rows = await queryProducts(searchParams);
    const efficiency = await fetchPlanningEfficiency();
    const items = rows.map(mapProductRow).map((product) => ({
      ...product,
      density_per_acre: computeDensity(product, efficiency)
    }));
    return NextResponse.json(items);
  } catch (error) {
    console.error('Direct SQL error fetching products:', error);
    return NextResponse.json(
      {
        error: 'Unexpected error fetching products',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  if (DJANGO_API_URL) {
    try {
      const response = await fetch(`${DJANGO_API_URL.replace(/\/$/, '')}/api/landuse/products/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const text = await response.text();
      let payload: unknown = null;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch {
        payload = text;
      }

      if (response.ok) {
        return NextResponse.json(payload ?? {}, { status: response.status });
      }

      console.error('Failed to create product via Django:', response.status, text);
      if (response.status !== 404 && response.status !== 502) {
        return NextResponse.json(
          { error: 'Failed to create product', details: payload },
          { status: response.status }
        );
      }
    } catch (error) {
      console.warn('Django product create unavailable, using SQL fallback:', error);
    }
  }

  try {
    const code = typeof (body as any).code === 'string' ? (body as any).code.trim() : '';
    const lotWidth = Number((body as any).lot_w_ft ?? (body as any).lotWidth);
    const lotDepth = Number((body as any).lot_d_ft ?? (body as any).lotDepth);
    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }
    if (!Number.isFinite(lotWidth) || lotWidth <= 0 || !Number.isFinite(lotDepth) || lotDepth <= 0) {
      return NextResponse.json({ error: 'Lot width and depth must be greater than 0' }, { status: 400 });
    }

    const lotArea = lotWidth * lotDepth;
    const typeIdValue = (body as any).type_id ?? (body as any).typeId ?? null;
    const isActive = (body as any).is_active ?? (body as any).isActive;

    const values = [
      code,
      lotWidth,
      lotDepth,
      lotArea,
      typeIdValue !== null && typeIdValue !== undefined ? Number(typeIdValue) : null,
      isActive === undefined ? true : Boolean(isActive)
    ];

    const result = await sql.query<ProductRow>(
      `
        INSERT INTO landscape.res_lot_product (
          code,
          lot_w_ft,
          lot_d_ft,
          lot_area_sf,
          type_id,
          is_active,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
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
    if (!row) {
      throw new Error('Insert failed');
    }

    const product = (await getProductByIdDirect(row.product_id)) ?? mapProductRow(row);
    const efficiency = await fetchPlanningEfficiency();
    return NextResponse.json(
      {
        ...product,
        density_per_acre: computeDensity(product, efficiency)
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Product code already exists' }, { status: 409 });
    }

    console.error('Direct SQL error creating product:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unexpected error creating product'
      },
      { status: 500 }
    );
  }
}
