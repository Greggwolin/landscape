import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const typeId = searchParams.get('type_id');

  if (!typeId) {
    return NextResponse.json(
      { error: 'type_id parameter required' },
      { status: 400 }
    );
  }

  try {
    const products = await sql`
      SELECT DISTINCT
        p.product_id,
        p.code,
        p.lot_w_ft,
        p.lot_d_ft,
        p.lot_area_sf
      FROM res_lot_product p
      JOIN type_lot_product tlp ON tlp.product_id = p.product_id
      WHERE tlp.type_id = ${typeId}
      ORDER BY p.lot_area_sf, p.code
    `;

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { code, lot_w_ft, lot_d_ft, linked_type_ids = [] } = await request.json();

    // Validation
    if (!code || !lot_w_ft || !lot_d_ft) {
      return NextResponse.json(
        { error: 'Code, lot width, and lot depth are required' },
        { status: 400 }
      );
    }

    if (lot_w_ft <= 0 || lot_d_ft <= 0) {
      return NextResponse.json(
        { error: 'Lot dimensions must be greater than 0' },
        { status: 400 }
      );
    }

    // Create the lot product (lot_area_sf is auto-calculated by database)
    const productResult = await sql`
      INSERT INTO res_lot_product (code, lot_w_ft, lot_d_ft)
      VALUES (${code}, ${lot_w_ft}, ${lot_d_ft})
      RETURNING product_id, code, lot_w_ft, lot_d_ft, lot_area_sf
    `;

    const product = productResult[0];

    // Associate with types if provided
    if (linked_type_ids.length > 0) {
      for (const typeId of linked_type_ids) {
        await sql`
          INSERT INTO type_lot_product (type_id, product_id)
          VALUES (${typeId}, ${product.product_id})
          ON CONFLICT DO NOTHING
        `;
      }
    }

    return NextResponse.json({
      ...product,
      linked_type_ids
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating lot product:', error);

    if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
      return NextResponse.json(
        { error: 'Lot product code already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create lot product', details: error.message },
      { status: 500 }
    );
  }
}
