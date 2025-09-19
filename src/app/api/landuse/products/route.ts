import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// Get lot products and their subtype associations
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const subtypeId = searchParams.get('subtype_id');
    const familyId = searchParams.get('family_id');

    let products = [];

    try {
      if (subtypeId) {
        // Get products for specific subtype
        products = await sql`
          SELECT 
            p.product_id,
            p.code,
            p.lot_w_ft,
            p.lot_d_ft,
            p.lot_area_sf,
            s.subtype_id,
            s.name as subtype_name,
            s.code as subtype_code,
            f.name as family_name
          FROM landscape.res_lot_product p
          JOIN landscape.subtype_lot_product sp ON sp.product_id = p.product_id
          JOIN landscape.lu_subtype s ON s.subtype_id = sp.subtype_id
          JOIN landscape.lu_family f ON f.family_id = s.family_id
          WHERE sp.subtype_id = ${subtypeId}
          ORDER BY p.code
        `;
      } else if (familyId) {
        // Get products for specific family
        products = await sql`
          SELECT 
            p.product_id,
            p.code,
            p.lot_w_ft,
            p.lot_d_ft,
            p.lot_area_sf,
            s.subtype_id,
            s.name as subtype_name,
            s.code as subtype_code,
            f.name as family_name
          FROM landscape.res_lot_product p
          JOIN landscape.subtype_lot_product sp ON sp.product_id = p.product_id
          JOIN landscape.lu_subtype s ON s.subtype_id = sp.subtype_id
          JOIN landscape.lu_family f ON f.family_id = s.family_id
          WHERE s.family_id = ${familyId} AND s.active = true
          ORDER BY s.ord, p.code
        `;
      } else {
        // Get all products with their associations
        products = await sql`
          SELECT 
            p.product_id,
            p.code,
            p.lot_w_ft,
            p.lot_d_ft,
            p.lot_area_sf,
            array_agg(
              json_build_object(
                'subtype_id', s.subtype_id,
                'subtype_name', s.name,
                'subtype_code', s.code,
                'family_name', f.name
              )
            ) as associated_subtypes
          FROM landscape.res_lot_product p
          LEFT JOIN landscape.subtype_lot_product sp ON sp.product_id = p.product_id
          LEFT JOIN landscape.lu_subtype s ON s.subtype_id = sp.subtype_id AND s.active = true
          LEFT JOIN landscape.lu_family f ON f.family_id = s.family_id AND f.active = true
          GROUP BY p.product_id, p.code, p.lot_w_ft, p.lot_d_ft, p.lot_area_sf
          ORDER BY p.code
        `;
      }
    } catch (error) {
      console.warn('Error fetching lot products:', error);
      return NextResponse.json([]);
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
    const { code, lot_w_ft, lot_d_ft, lot_area_sf, subtype_ids = [] } = await request.json();

    if (!code || !lot_w_ft || !lot_d_ft) {
      return NextResponse.json(
        { error: 'Code, lot width, and lot depth are required' },
        { status: 400 }
      );
    }

    // Calculate area if not provided
    const calculatedArea = lot_area_sf || (lot_w_ft * lot_d_ft);

    // Create the lot product
    const productResult = await sql`
      INSERT INTO landscape.res_lot_product (code, lot_w_ft, lot_d_ft, lot_area_sf)
      VALUES (${code}, ${lot_w_ft}, ${lot_d_ft}, ${calculatedArea})
      RETURNING *
    `;

    const product = productResult[0];

    // Associate with subtypes if provided
    if (subtype_ids.length > 0) {
      const associations = subtype_ids.map((subtypeId: number) => 
        sql`INSERT INTO landscape.subtype_lot_product (subtype_id, product_id) VALUES (${subtypeId}, ${product.product_id})`
      );
      
      await Promise.all(associations);
    }

    return NextResponse.json({
      ...product,
      associated_subtypes: subtype_ids
    });

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