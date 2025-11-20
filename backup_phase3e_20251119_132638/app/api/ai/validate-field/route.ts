/**
 * API endpoint to validate extracted field values against DVLs (Domain Value Lists)
 * Returns match status and suggestions
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fieldName, value, projectId } = body;

    if (!fieldName || !value) {
      return NextResponse.json({
        isValid: false,
        message: 'Field name and value are required'
      });
    }

    // Validate lot product fields against res_lot_product DVL
    if (fieldName.includes('lot_product')) {
      const normalizedValue = value.replace(/['\s]/g, '').toLowerCase();

      // Check if it matches any lot product in DVL
      const matchingProducts = await sql`
        SELECT code, lot_w_ft, lot_d_ft, lot_area_sf
        FROM landscape.res_lot_product
        WHERE LOWER(code) = ${normalizedValue}
        LIMIT 1
      `;

      if (matchingProducts.length > 0) {
        const product = matchingProducts[0];
        return NextResponse.json({
          isValid: true,
          dvlMatch: true,
          matchedValue: product.code,
          metadata: {
            width: product.lot_w_ft,
            depth: product.lot_d_ft,
            area: product.lot_area_sf
          },
          message: `✓ Matches DVL: ${product.code} (${product.lot_w_ft}' x ${product.lot_d_ft}', ${product.lot_area_sf} sf)`,
          confidence: 0.95
        });
      } else {
        // Try to find similar products
        const similarProducts = await sql`
          SELECT code, lot_w_ft, lot_d_ft
          FROM landscape.res_lot_product
          WHERE code ILIKE ${`%${normalizedValue.substring(0, 3)}%`}
          LIMIT 5
        `;

        return NextResponse.json({
          isValid: false,
          dvlMatch: false,
          message: `⚠ Not found in DVL. Did you mean: ${similarProducts.map((p: any) => p.code).join(', ')}?`,
          suggestions: similarProducts.map((p: any) => ({
            code: p.code,
            display: `${p.code} (${p.lot_w_ft}' x ${p.lot_d_ft}')`
          })),
          confidence: 0.40
        });
      }
    }

    // Validate land use type fields
    if (fieldName.includes('type_code') || fieldName.includes('land_use')) {
      const matchingTypes = await sql`
        SELECT lst.code, lst.name, lf.name as family_name
        FROM landscape.lu_subtype lst
        LEFT JOIN landscape.lu_family lf ON lf.family_id = lst.family_id
        WHERE UPPER(lst.code) = UPPER(${value})
        OR UPPER(lst.name) ILIKE UPPER(${`%${value}%`})
        AND lst.active = true
        LIMIT 1
      `;

      if (matchingTypes.length > 0) {
        const type = matchingTypes[0];
        return NextResponse.json({
          isValid: true,
          dvlMatch: true,
          matchedValue: type.code,
          metadata: {
            name: type.name,
            family: type.family_name
          },
          message: `✓ Matches DVL: ${type.code} - ${type.name} (${type.family_name})`,
          confidence: 0.95
        });
      } else {
        return NextResponse.json({
          isValid: false,
          dvlMatch: false,
          message: `⚠ Land use type not found in DVL. Please verify.`,
          confidence: 0.40
        });
      }
    }

    // Default: no specific DVL validation for this field
    return NextResponse.json({
      isValid: true,
      dvlMatch: null,
      message: 'No DVL validation available for this field',
      confidence: 0.80
    });

  } catch (error) {
    console.error('Field validation error:', error);
    return NextResponse.json({
      isValid: false,
      message: 'Validation error occurred',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
