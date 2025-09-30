// app/api/landuse/lot-products/[subtypeId]/route.ts
// API endpoint for lot products filtered by subtype

import { NextResponse } from 'next/server';
import { sql } from '../../../../../lib/db';

export async function GET(
  request: Request,
  { params }: { params: { subtypeId: string } }
) {
  try {
    const { subtypeId: subtypeIdStr } = await params;
    const subtypeId = parseInt(subtypeIdStr);

    if (!subtypeId || isNaN(subtypeId)) {
      return NextResponse.json({
        error: 'Valid subtype_id parameter required'
      }, { status: 400 });
    }

    // Get subtype info to construct product codes
    const subtype = await sql`
      SELECT code, family_id FROM landscape.lu_subtype WHERE subtype_id = ${subtypeId}
    `;

    if (!subtype || subtype.length === 0) {
      return NextResponse.json({
        error: 'Subtype not found'
      }, { status: 404 });
    }

    const subtypeCode = subtype[0].code;
    const familyId = subtype[0].family_id;

    let products: any[] = [];

    if (familyId === 1) {
      // Residential - use lot products from res_lot_product (just the lot dimensions)
      const lotProducts = await sql`
        SELECT
          product_id,
          code,
          lot_w_ft,
          lot_d_ft,
          lot_area_sf
        FROM landscape.res_lot_product
        ORDER BY lot_area_sf ASC
      `;

      products = lotProducts.map(product => ({
        product_id: product.product_id,
        code: product.code,
        name: product.code,
        lot_width: product.lot_w_ft,
        lot_depth: product.lot_d_ft,
        lot_area: product.lot_area_sf,
        subtype_id: subtypeId
      }));
    } else if (familyId === 2) {
      // Commercial - provide predefined commercial products
      const commercialProducts = [
        { code: 'Neighborhood Shopping', name: 'Neighborhood Shopping' },
        { code: 'Community Shopping', name: 'Community Shopping' },
        { code: 'Regional Power Center', name: 'Regional Power Center' },
        { code: 'Super Regional Mall', name: 'Super Regional Mall' },
        { code: 'Strip Center', name: 'Strip Center' },
        { code: 'Standalone', name: 'Standalone' }
      ];

      if (subtypeCode === 'RET') {
        // Retail gets shopping centers
        products = commercialProducts.filter(p => p.code.includes('Shopping') || p.code.includes('Center') || p.code.includes('Mall')).map((product, index) => ({
          product_id: `ret_${index + 1}`,
          code: product.code,
          name: product.name,
          subtype_id: subtypeId
        }));
      } else if (subtypeCode === 'OFC') {
        // Office gets office types
        const officeProducts = [
          { code: 'Class A Office', name: 'Class A Office' },
          { code: 'Class B Office', name: 'Class B Office' },
          { code: 'Medical Office', name: 'Medical Office' },
          { code: 'Flex Office', name: 'Flex Office' }
        ];
        products = officeProducts.map((product, index) => ({
          product_id: `ofc_${index + 1}`,
          code: product.code,
          name: product.name,
          subtype_id: subtypeId
        }));
      } else if (subtypeCode === 'HOT') {
        // Hotel gets hotel types
        const hotelProducts = [
          { code: 'Budget Hotel', name: 'Budget Hotel' },
          { code: 'Mid-Scale Hotel', name: 'Mid-Scale Hotel' },
          { code: 'Upscale Hotel', name: 'Upscale Hotel' },
          { code: 'Luxury Hotel', name: 'Luxury Hotel' }
        ];
        products = hotelProducts.map((product, index) => ({
          product_id: `hot_${index + 1}`,
          code: product.code,
          name: product.name,
          subtype_id: subtypeId
        }));
      }
    } else {
      // Other families - provide generic products
      products = [{
        product_id: `gen_1`,
        code: 'Standard',
        name: 'Standard',
        subtype_id: subtypeId
      }];
    }

    return NextResponse.json(products);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Lot products API error:', error);
    return NextResponse.json({
      error: 'Failed to fetch lot products',
      details: message
    }, { status: 500 });
  }
}