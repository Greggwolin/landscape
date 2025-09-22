import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// Get lot products and their subtype associations (using hardcoded data until schema is updated)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const subtypeId = searchParams.get('subtype_id');
    const familyId = searchParams.get('family_id');

    // Hardcoded products data for compatibility
    const allProducts = [
      {
        product_id: 1,
        code: 'SFD-50X100',
        lot_w_ft: 50,
        lot_d_ft: 100,
        lot_area_sf: 5000,
        subtype_id: 1,
        subtype_name: 'Single Family Detached',
        subtype_code: 'SFD',
        family_name: 'Residential'
      },
      {
        product_id: 2,
        code: 'SFD-60X120',
        lot_w_ft: 60,
        lot_d_ft: 120,
        lot_area_sf: 7200,
        subtype_id: 1,
        subtype_name: 'Single Family Detached',
        subtype_code: 'SFD',
        family_name: 'Residential'
      },
      {
        product_id: 3,
        code: 'TH-20X100',
        lot_w_ft: 20,
        lot_d_ft: 100,
        lot_area_sf: 2000,
        subtype_id: 3,
        subtype_name: 'Townhomes',
        subtype_code: 'TH',
        family_name: 'Residential'
      },
      {
        product_id: 4,
        code: 'CONDO-1BR',
        lot_w_ft: null,
        lot_d_ft: null,
        lot_area_sf: 750,
        subtype_id: 4,
        subtype_name: 'Condominiums',
        subtype_code: 'CONDO',
        family_name: 'Residential'
      }
    ];

    let products = [];

    if (subtypeId) {
      // Filter products for specific subtype
      products = allProducts.filter(p => p.subtype_id.toString() === subtypeId);
    } else if (familyId) {
      // For now, assume family_id 1 is Residential
      products = familyId === '1' ? allProducts : [];
    } else {
      // Return all products
      products = allProducts;
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