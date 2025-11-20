// app/api/landuse/lot-products/[subtypeId]/route.ts
// API endpoint for lot products filtered by subtype

import { NextResponse } from 'next/server';
import { sql } from '../../../../../lib/db';

type Params = { params: Promise<{ subtypeId: string }> };

export async function GET(
  request: Request,
  context: Params
) {
  try {
    const { subtypeId: subtypeIdStr } = await context.params;
    const subtypeId = parseInt(subtypeIdStr);

    if (!subtypeId || isNaN(subtypeId)) {
      return NextResponse.json({
        error: 'Valid subtype_id parameter required'
      }, { status: 400 });
    }

    // Get type info to construct product codes
    // Note: Parameter is called subtypeId but now receives type_id from lu_type
    const type = await sql`
      SELECT code, family_id FROM landscape.lu_type WHERE type_id = ${subtypeId}
    `;

    if (!type || type.length === 0) {
      return NextResponse.json({
        error: 'Type not found'
      }, { status: 404 });
    }

    const typeCode = type[0].code;
    const familyId = Number(type[0].family_id); // Convert to number for comparison

    console.log('🔍 Lot Products API - type_id:', subtypeId, 'typeCode:', typeCode, 'familyId:', familyId, 'familyId type:', typeof familyId);

    let products: any[] = [];

    if (familyId === 1) {
      // Residential family
      if (typeCode === 'SFD' || typeCode === 'BTR') {
        // Single Family Detached and Build-to-Rent share lot products
        if (typeCode === 'BTR') {
          // Build-to-Rent - placeholder product for now
          products = [{
            product_id: 'btr_1',
            code: 'Product List Pending',
            name: 'Product List Pending',
            subtype_id: subtypeId
          }];
        } else {
          // Single Family Detached - use lot products from res_lot_product
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
        }
      } else if (typeCode === 'SFA') {
        // Single Family Attached - Townhomes and Condos
        const sfaProducts = [
          { code: 'Townhomes', name: 'Townhomes' },
          { code: 'Condos', name: 'Condos' }
        ];
        products = sfaProducts.map((product, index) => ({
          product_id: `sfa_${index + 1}`,
          code: product.code,
          name: product.name,
          subtype_id: subtypeId
        }));
      } else {
        // Other residential types (Condo, MF) - no products
        products = [];
      }
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

      if (typeCode === 'RET') {
        // Retail gets shopping centers
        products = commercialProducts.filter(p => p.code.includes('Shopping') || p.code.includes('Center') || p.code.includes('Mall')).map((product, index) => ({
          product_id: `ret_${index + 1}`,
          code: product.code,
          name: product.name,
          subtype_id: subtypeId
        }));
      } else if (typeCode === 'OFC' || typeCode === 'OFF') {
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
    } else if (familyId === 8) {
      // Institutional - provide school products for Schools type
      if (typeCode === 'SCHOOLS' || typeCode === 'SCHOOL-K12' || typeCode === 'SCHOOL-HE') {
        const schoolProducts = [
          { code: 'Preschool', name: 'Preschool' },
          { code: 'K-12 Public', name: 'K-12 Public' },
          { code: 'K-12 Private', name: 'K-12 Private' },
          { code: 'K-12 Charter', name: 'K-12 Charter' },
          { code: 'Higher Ed', name: 'Higher Ed' }
        ];
        products = schoolProducts.map((product, index) => ({
          product_id: `school_${index + 1}`,
          code: product.code,
          name: product.name,
          subtype_id: subtypeId
        }));
      }
    } else {
      // Other families - no products available
      products = [];
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