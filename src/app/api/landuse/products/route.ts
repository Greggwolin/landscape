import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// Get lot products from res_lot_product table
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const typeId = searchParams.get('type_id');

    let products;
    if (typeId) {
      // Filter products by type via junction table
      products = await sql`
        SELECT
          p.product_id,
          p.code,
          p.lot_w_ft,
          p.lot_d_ft,
          p.lot_area_sf,
          COALESCE(
            json_agg(
              json_build_object(
                'type_id', t.type_id,
                'type_name', t.name,
                'type_code', t.code
              )
            ) FILTER (WHERE t.type_id IS NOT NULL),
            '[]'
          ) as linked_types
        FROM landscape.res_lot_product p
        INNER JOIN landscape.type_lot_product tlp ON p.product_id = tlp.product_id
        LEFT JOIN landscape.lu_type t ON tlp.type_id = t.type_id
        WHERE tlp.type_id = ${typeId}
        GROUP BY p.product_id, p.code, p.lot_w_ft, p.lot_d_ft, p.lot_area_sf
        ORDER BY p.code
      `;
    } else {
      // Return all products with their linked types
      products = await sql`
        SELECT
          p.product_id,
          p.code,
          p.lot_w_ft,
          p.lot_d_ft,
          p.lot_area_sf,
          COALESCE(
            json_agg(
              json_build_object(
                'type_id', t.type_id,
                'type_name', t.name,
                'type_code', t.code
              )
            ) FILTER (WHERE t.type_id IS NOT NULL),
            '[]'
          ) as linked_types
        FROM landscape.res_lot_product p
        LEFT JOIN landscape.type_lot_product tlp ON p.product_id = tlp.product_id
        LEFT JOIN landscape.lu_type t ON tlp.type_id = t.type_id
        GROUP BY p.product_id, p.code, p.lot_w_ft, p.lot_d_ft, p.lot_area_sf
        ORDER BY p.code
      `;
    }

    return NextResponse.json(products);

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Error fetching lot products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lot products', details: msg },
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
      INSERT INTO landscape.res_lot_product (code, lot_w_ft, lot_d_ft)
      VALUES (${code}, ${lot_w_ft}, ${lot_d_ft})
      RETURNING product_id, code, lot_w_ft, lot_d_ft, lot_area_sf
    `;

    const product = productResult[0];

    // Associate with types if provided
    if (linked_type_ids.length > 0) {
      for (const typeId of linked_type_ids) {
        await sql`
          INSERT INTO landscape.type_lot_product (type_id, product_id)
          VALUES (${typeId}, ${product.product_id})
          ON CONFLICT DO NOTHING
        `;
      }
    }

    return NextResponse.json({
      ...product,
      linked_type_ids
    }, { status: 201 });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Error creating lot product:', error);

    if (msg.includes('unique')) {
      return NextResponse.json(
        { error: 'Lot product code already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create lot product', details: msg },
      { status: 500 }
    );
  }
}