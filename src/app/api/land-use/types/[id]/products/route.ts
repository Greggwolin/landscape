import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

const sql = neon(process.env.DATABASE_URL!);

type Params = { params: Promise<{ id: string }> };

// GET all products linked to a specific type
export async function GET(
  request: Request,
  context: Params
) {
  try {
    const { id } = await context.params;
    const typeId = parseInt(id);

    const products = await sql`
      SELECT
        p.product_id,
        p.code,
        p.lot_w_ft,
        p.lot_d_ft,
        p.lot_area_sf
      FROM landscape.res_lot_product p
      INNER JOIN landscape.type_lot_product tlp ON p.product_id = tlp.product_id
      WHERE tlp.type_id = ${typeId}
      ORDER BY p.code
    `;

    return NextResponse.json(products);
  } catch (error: any) {
    console.error('Error fetching products for type:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Link a product to a type
export async function POST(
  request: Request,
  context: Params
) {
  try {
    const { id } = await context.params;
    const typeId = parseInt(id);
    const { product_id } = await request.json();

    if (!product_id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Verify type exists
    const typeCheck = await sql`
      SELECT type_id FROM landscape.lu_type WHERE type_id = ${typeId}
    `;

    if (typeCheck.length === 0) {
      return NextResponse.json(
        { error: 'Type not found' },
        { status: 404 }
      );
    }

    // Verify product exists
    const productCheck = await sql`
      SELECT product_id FROM landscape.res_lot_product WHERE product_id = ${product_id}
    `;

    if (productCheck.length === 0) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Create the link
    await sql`
      INSERT INTO landscape.type_lot_product (type_id, product_id)
      VALUES (${typeId}, ${product_id})
      ON CONFLICT DO NOTHING
    `;

    return NextResponse.json(
      { success: true, type_id: typeId, product_id },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error linking product to type:', error);
    return NextResponse.json(
      { error: 'Failed to link product', details: error.message },
      { status: 500 }
    );
  }
}
