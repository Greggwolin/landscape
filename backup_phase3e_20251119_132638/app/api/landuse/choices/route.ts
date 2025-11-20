// app/api/landuse/choices/route.ts
// Unified land use choices API - uses vw_lu_choices view for consistent dropdown data

import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'families', 'types', 'codes'
    const familyId = searchParams.get('family_id');
    const typeId = searchParams.get('type_id');
    let result;

    const normalizeProducts = (data: unknown) => {
      if (!Array.isArray(data)) return [] as {
        product_id: number;
        product_name: string;
        code: string;
        lot_width: number | null;
        lot_depth: number | null;
        lot_area_sf: number | null;
      }[];

      return data
        .map(item => {
          if (typeof item !== 'object' || item === null) return null;
          const record = item as Record<string, unknown>;
          const productIdRaw = record.product_id;
          const codeRaw = record.code;
          if (productIdRaw == null || typeof codeRaw !== 'string' || codeRaw.trim().length === 0) {
            return null;
          }

          const productId = typeof productIdRaw === 'number' ? productIdRaw : Number(productIdRaw);
          if (!Number.isFinite(productId)) return null;

          const lotWidthRaw = record.lot_w_ft;
          const lotDepthRaw = record.lot_d_ft;
          const lotAreaRaw = record.lot_area_sf;

          const toNullableNumber = (value: unknown) => {
            if (typeof value === 'number') return value;
            const numeric = Number(value);
            return Number.isFinite(numeric) ? numeric : null;
          };

          return {
            product_id: productId,
            product_name: codeRaw,
            code: codeRaw,
            lot_width: toNullableNumber(lotWidthRaw),
            lot_depth: toNullableNumber(lotDepthRaw),
            lot_area_sf: toNullableNumber(lotAreaRaw)
          };
        })
        .filter((entry): entry is {
          product_id: number;
          product_name: string;
          code: string;
          lot_width: number | null;
          lot_depth: number | null;
          lot_area_sf: number | null;
        } => Boolean(entry));
    };

    switch (type) {
      case 'families':
        // Return hardcoded families for now until schema is updated
        const defaultFamilies = [
          { family_id: 1, code: 'RES', family_code: 'RES', name: 'Residential', family_name: 'Residential', family_active: true },
          { family_id: 2, code: 'COM', family_code: 'COM', name: 'Commercial', family_name: 'Commercial', family_active: true },
          { family_id: 9, code: 'MU', family_code: 'MU', name: 'Mixed Use', family_name: 'Mixed Use', family_active: true },
          { family_id: 10, code: 'OS', family_code: 'OS', name: 'Open Space', family_name: 'Open Space', family_active: true }
        ];
        result = defaultFamilies;
        break;

      case 'types':
        // Return hardcoded types for now until schema is updated
        const defaultTypes = [
          // Residential types
          { type_id: 1, code: 'SFD', type_code: 'SFD', name: 'Single Family Detached', type_name: 'Single Family Detached', type_order: 1, type_active: true, family_id: 1 },
          { type_id: 2, code: 'SFA', type_code: 'SFA', name: 'Single Family Attached', type_name: 'Single Family Attached', type_order: 2, type_active: true, family_id: 1 },
          { type_id: 3, code: 'TH', type_code: 'TH', name: 'Townhomes', type_name: 'Townhomes', type_order: 3, type_active: true, family_id: 1 },
          { type_id: 4, code: 'CONDO', type_code: 'CONDO', name: 'Condominiums', type_name: 'Condominiums', type_order: 4, type_active: true, family_id: 1 },
          { type_id: 5, code: 'APT', type_code: 'APT', name: 'Apartments', type_name: 'Apartments', type_order: 5, type_active: true, family_id: 1 },

          // Commercial types
          { type_id: 6, code: 'RETAIL', type_code: 'RETAIL', name: 'Retail', type_name: 'Retail', type_order: 1, type_active: true, family_id: 2 },
          { type_id: 7, code: 'OFFICE', type_code: 'OFFICE', name: 'Office', type_name: 'Office', type_order: 2, type_active: true, family_id: 2 },
          { type_id: 8, code: 'HOTEL', type_code: 'HOTEL', name: 'Hotel', type_name: 'Hotel', type_order: 3, type_active: true, family_id: 2 },

          // Mixed Use types
          { type_id: 9, code: 'MU-LOW', type_code: 'MU-LOW', name: 'Mixed Use Low Intensity', type_name: 'Mixed Use Low Intensity', type_order: 1, type_active: true, family_id: 9 },
          { type_id: 10, code: 'MU-HIGH', type_code: 'MU-HIGH', name: 'Mixed Use High Intensity', type_name: 'Mixed Use High Intensity', type_order: 2, type_active: true, family_id: 9 },

          // Open Space types
          { type_id: 11, code: 'PARK', type_code: 'PARK', name: 'Parks', type_name: 'Parks', type_order: 1, type_active: true, family_id: 10 },
          { type_id: 12, code: 'TRAIL', type_code: 'TRAIL', name: 'Trails', type_name: 'Trails', type_order: 2, type_active: true, family_id: 10 }
        ];

        if (familyId) {
          result = defaultTypes.filter(type => type.family_id.toString() === familyId);
        } else {
          result = defaultTypes;
        }
        break;

      case 'codes': {
        // Return hardcoded land use codes for now until schema is updated
        const defaultLandUseCodes = [
          {
            landuse_id: 1, landuse_code: 'SFD-LDR', landuse_type: 'Residential',
            name: 'Single Family Detached - Low Density', description: 'Low density single family homes',
            active: true, type_id: 1, type_code: 'SFD', type_name: 'Single Family Detached',
            type_active: true, type_order: 1, family_id: 1, family_code: 'RES',
            family_name: 'Residential', family_active: true, has_programming: false,
            has_zoning: false, has_family: true, has_type: true
          },
          {
            landuse_id: 2, landuse_code: 'SFD-MDR', landuse_type: 'Residential',
            name: 'Single Family Detached - Medium Density', description: 'Medium density single family homes',
            active: true, type_id: 1, type_code: 'SFD', type_name: 'Single Family Detached',
            type_active: true, type_order: 1, family_id: 1, family_code: 'RES',
            family_name: 'Residential', family_active: true, has_programming: false,
            has_zoning: false, has_family: true, has_type: true
          },
          {
            landuse_id: 3, landuse_code: 'TH-MDR', landuse_type: 'Residential',
            name: 'Townhomes - Medium Density', description: 'Medium density townhomes',
            active: true, type_id: 3, type_code: 'TH', type_name: 'Townhomes',
            type_active: true, type_order: 3, family_id: 1, family_code: 'RES',
            family_name: 'Residential', family_active: true, has_programming: false,
            has_zoning: false, has_family: true, has_type: true
          },
          {
            landuse_id: 4, landuse_code: 'CONDO-HDR', landuse_type: 'Residential',
            name: 'Condominiums - High Density', description: 'High density condominiums',
            active: true, type_id: 4, type_code: 'CONDO', type_name: 'Condominiums',
            type_active: true, type_order: 4, family_id: 1, family_code: 'RES',
            family_name: 'Residential', family_active: true, has_programming: false,
            has_zoning: false, has_family: true, has_type: true
          },
          {
            landuse_id: 5, landuse_code: 'RETAIL', landuse_type: 'Commercial',
            name: 'Retail Commercial', description: 'Retail commercial space',
            active: true, type_id: 6, type_code: 'RETAIL', type_name: 'Retail',
            type_active: true, type_order: 1, family_id: 2, family_code: 'COM',
            family_name: 'Commercial', family_active: true, has_programming: false,
            has_zoning: false, has_family: true, has_type: true
          },
          {
            landuse_id: 6, landuse_code: 'OFFICE', landuse_type: 'Commercial',
            name: 'Office Commercial', description: 'Office commercial space',
            active: true, type_id: 7, type_code: 'OFFICE', type_name: 'Office',
            type_active: true, type_order: 2, family_id: 2, family_code: 'COM',
            family_name: 'Commercial', family_active: true, has_programming: false,
            has_zoning: false, has_family: true, has_type: true
          }
        ];

        if (typeId) {
          result = defaultLandUseCodes.filter(code => code.type_id.toString() === typeId);
        } else {
          result = defaultLandUseCodes;
        }
        break;
      }

      case 'products':
        // Return hardcoded products for now until schema is updated
        const defaultProducts = [
          // SFD products (type_id: 1)
          { product_id: 1, product_name: '50\' x 100\' Lot', code: 'SFD-50X100', lot_width: 50, lot_depth: 100, lot_area_sf: 5000, type_id: 1 },
          { product_id: 2, product_name: '60\' x 120\' Lot', code: 'SFD-60X120', lot_width: 60, lot_depth: 120, lot_area_sf: 7200, type_id: 1 },
          { product_id: 3, product_name: '80\' x 150\' Lot', code: 'SFD-80X150', lot_width: 80, lot_depth: 150, lot_area_sf: 12000, type_id: 1 },

          // Townhome products (type_id: 3)
          { product_id: 4, product_name: '20\' x 100\' Townhome', code: 'TH-20X100', lot_width: 20, lot_depth: 100, lot_area_sf: 2000, type_id: 3 },
          { product_id: 5, product_name: '24\' x 100\' Townhome', code: 'TH-24X100', lot_width: 24, lot_depth: 100, lot_area_sf: 2400, type_id: 3 },

          // Condo products (type_id: 4)
          { product_id: 6, product_name: '1 Bedroom Condo', code: 'CONDO-1BR', lot_width: null, lot_depth: null, lot_area_sf: 750, type_id: 4 },
          { product_id: 7, product_name: '2 Bedroom Condo', code: 'CONDO-2BR', lot_width: null, lot_depth: null, lot_area_sf: 1200, type_id: 4 },

          // Apartment products (type_id: 5)
          { product_id: 8, product_name: 'Studio Apartment', code: 'APT-STUDIO', lot_width: null, lot_depth: null, lot_area_sf: 500, type_id: 5 },
          { product_id: 9, product_name: '1 Bedroom Apartment', code: 'APT-1BR', lot_width: null, lot_depth: null, lot_area_sf: 650, type_id: 5 },
          { product_id: 10, product_name: '2 Bedroom Apartment', code: 'APT-2BR', lot_width: null, lot_depth: null, lot_area_sf: 950, type_id: 5 }
        ];

        if (typeId) {
          result = defaultProducts.filter(product => product.type_id.toString() === typeId);
        } else {
          result = defaultProducts;
        }
        break;

      default:
        // Return empty array for now until comprehensive view is implemented
        result = [];
        break;
    }

    return NextResponse.json(result || []);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Land use choices API error:', error);
    return NextResponse.json({
      error: 'Failed to fetch land use choices',
      details: message
    }, { status: 500 });
  }
}
