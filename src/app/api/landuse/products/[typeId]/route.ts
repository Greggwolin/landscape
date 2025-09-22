// app/api/landuse/products/[typeId]/route.ts
// API endpoint for lot products filtered by type

import { NextResponse } from 'next/server';
import { sql } from '../../../../../lib/db';

export async function GET(
  request: Request,
  { params }: { params: { typeId: string } }
) {
  try {
    const { typeId: typeIdStr } = await params;
    const typeId = parseInt(typeIdStr);

    if (!typeId || isNaN(typeId)) {
      return NextResponse.json({
        error: 'Valid type_id parameter required'
      }, { status: 400 });
    }

    // Return hardcoded products for now until schema is updated
    const defaultProducts = [
      // SFD products (type_id: 1)
      { product_id: 1, product_name: '50\' x 100\' Lot', code: 'SFD-50X100', lot_width: 50, lot_depth: 100, lot_area_sf: 5000, type_id: 1 },
      { product_id: 2, product_name: '60\' x 120\' Lot', code: 'SFD-60X120', lot_width: 60, lot_depth: 120, lot_area_sf: 7200, type_id: 1 },
      { product_id: 3, product_name: '80\' x 150\' Lot', code: 'SFD-80X150', lot_width: 80, lot_depth: 150, lot_area_sf: 12000, type_id: 1 },

      // SFA products (type_id: 2)
      { product_id: 13, product_name: '30\' x 100\' Attached', code: 'SFA-30X100', lot_width: 30, lot_depth: 100, lot_area_sf: 3000, type_id: 2 },
      { product_id: 14, product_name: '25\' x 120\' Attached', code: 'SFA-25X120', lot_width: 25, lot_depth: 120, lot_area_sf: 3000, type_id: 2 },

      // Townhome products (type_id: 3)
      { product_id: 4, product_name: '20\' x 100\' Townhome', code: 'TH-20X100', lot_width: 20, lot_depth: 100, lot_area_sf: 2000, type_id: 3 },
      { product_id: 5, product_name: '24\' x 100\' Townhome', code: 'TH-24X100', lot_width: 24, lot_depth: 100, lot_area_sf: 2400, type_id: 3 },

      // Condo products (type_id: 4)
      { product_id: 6, product_name: '1 Bedroom Condo', code: 'CONDO-1BR', lot_width: null, lot_depth: null, lot_area_sf: 750, type_id: 4 },
      { product_id: 7, product_name: '2 Bedroom Condo', code: 'CONDO-2BR', lot_width: null, lot_depth: null, lot_area_sf: 1200, type_id: 4 },
      { product_id: 15, product_name: '3 Bedroom Condo', code: 'CONDO-3BR', lot_width: null, lot_depth: null, lot_area_sf: 1600, type_id: 4 },

      // Apartment products (type_id: 5)
      { product_id: 8, product_name: 'Studio Apartment', code: 'APT-STUDIO', lot_width: null, lot_depth: null, lot_area_sf: 500, type_id: 5 },
      { product_id: 9, product_name: '1 Bedroom Apartment', code: 'APT-1BR', lot_width: null, lot_depth: null, lot_area_sf: 650, type_id: 5 },
      { product_id: 10, product_name: '2 Bedroom Apartment', code: 'APT-2BR', lot_width: null, lot_depth: null, lot_area_sf: 950, type_id: 5 },

      // Retail products (type_id: 6)
      { product_id: 16, product_name: 'Neighborhood Retail', code: 'RETAIL-NEIGH', lot_width: null, lot_depth: null, lot_area_sf: 2500, type_id: 6 },
      { product_id: 17, product_name: 'Regional Shopping', code: 'RETAIL-REG', lot_width: null, lot_depth: null, lot_area_sf: 50000, type_id: 6 },

      // Office products (type_id: 7)
      { product_id: 18, product_name: 'Class A Office', code: 'OFFICE-A', lot_width: null, lot_depth: null, lot_area_sf: 10000, type_id: 7 },
      { product_id: 19, product_name: 'Class B Office', code: 'OFFICE-B', lot_width: null, lot_depth: null, lot_area_sf: 5000, type_id: 7 },

      // Hotel products (type_id: 8)
      { product_id: 20, product_name: 'Limited Service Hotel', code: 'HOTEL-LTD', lot_width: null, lot_depth: null, lot_area_sf: 1000, type_id: 8 },
      { product_id: 21, product_name: 'Full Service Hotel', code: 'HOTEL-FULL', lot_width: null, lot_depth: null, lot_area_sf: 1500, type_id: 8 }
    ];

    const filteredProducts = defaultProducts.filter(product => product.type_id === typeId);

    return NextResponse.json(filteredProducts);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Land use products API error:', error);
    return NextResponse.json({
      error: 'Failed to fetch land use products',
      details: message
    }, { status: 500 });
  }
}