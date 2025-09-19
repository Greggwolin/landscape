// app/api/landuse/choices/route.ts
// Unified land use choices API - uses vw_lu_choices view for consistent dropdown data

import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'families', 'subtypes', 'codes'
    const familyId = searchParams.get('family_id');
    const subtypeId = searchParams.get('subtype_id');
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
        // Get all families from lu_family table (not just those with land use codes)
        result = await sql`
          SELECT
            family_id,
            code,
            code as family_code,
            name,
            name as family_name,
            active as family_active
          FROM landscape.lu_family
          WHERE active = true
          ORDER BY name;
        `;
        break;

      case 'subtypes':
        // Get all subtypes for a specific family from lu_subtype table
        if (familyId) {
          result = await sql`
            SELECT
              subtype_id,
              code,
              code as subtype_code,
              name,
              name as subtype_name,
              subtype_id as subtype_order,
              active as subtype_active,
              family_id
            FROM landscape.lu_subtype
            WHERE family_id = ${familyId} AND active = true
            ORDER BY subtype_id, name;
          `;
        } else {
          result = await sql`
            SELECT
              subtype_id,
              code,
              code as subtype_code,
              name,
              name as subtype_name,
              subtype_id as subtype_order,
              active as subtype_active,
              family_id
            FROM landscape.lu_subtype
            WHERE active = true
            ORDER BY family_id, subtype_id, name;
          `;
        }
        break;

      case 'codes': {
        const subtypeFilter = subtypeId && !Number.isNaN(Number(subtypeId))
          ? sql`AND l.subtype_id = ${Number(subtypeId)}`
          : sql``;

        result = await sql`
          SELECT
            l.landuse_id,
            l.landuse_code,
            l.landuse_type,
            COALESCE(l.name, l.landuse_code) AS name,
            COALESCE(l.description, '') AS description,
            COALESCE(l.active, true) AS active,
            l.subtype_id,
            COALESCE(s.code, '') AS subtype_code,
            COALESCE(s.name, '') AS subtype_name,
            COALESCE(s.active, true) AS subtype_active,
            COALESCE(s.ord, 0) AS subtype_order,
            s.family_id,
            COALESCE(f.code, '') AS family_code,
            COALESCE(f.name, '') AS family_name,
            COALESCE(f.active, true) AS family_active,
            CASE WHEN p.landuse_code IS NOT NULL THEN true ELSE false END AS has_programming,
            CASE WHEN z.landuse_code IS NOT NULL THEN true ELSE false END AS has_zoning,
            CASE WHEN s.family_id IS NOT NULL THEN true ELSE false END AS has_family,
            CASE WHEN l.subtype_id IS NOT NULL THEN true ELSE false END AS has_subtype
          FROM landscape.tbl_landuse l
          LEFT JOIN landscape.lu_subtype s ON s.subtype_id = l.subtype_id
          LEFT JOIN landscape.lu_family f ON f.family_id = s.family_id
          LEFT JOIN landscape.tbl_landuse_program p ON p.landuse_code = l.landuse_code
          LEFT JOIN landscape.tbl_zoning_control z ON z.landuse_code = l.landuse_code
          WHERE COALESCE(l.active, true) = true
          ${subtypeFilter}
          ORDER BY
            COALESCE(f.name, 'zzzz'),
            COALESCE(s.name, 'zzzz'),
            l.landuse_code;
        `;
        break;
      }

      case 'products':
        // Get products from the existing complex products API structure
        // Filter by subtype_id if provided
        if (subtypeId) {
          try {
            // Get products that are associated with this subtype
            const productsResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/landuse/products?subtype_id=${subtypeId}`);
            if (!productsResponse.ok) {
              console.log(`No products found for subtype_id ${subtypeId}, returning empty array`);
              result = [];
              break;
            }
            const productsData = await productsResponse.json();
            result = normalizeProducts(productsData);
          } catch (error) {
            console.log(`Error fetching products for subtype_id ${subtypeId}, returning empty array:`, error);
            result = [];
          }
        } else {
          try {
            // Get all products
            const productsResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/landuse/products`);
            if (!productsResponse.ok) {
              console.log(`No products found, returning empty array`);
              result = [];
              break;
            }
            const productsData = await productsResponse.json();
            result = normalizeProducts(productsData);
          } catch (error) {
            console.log(`Error fetching all products, returning empty array:`, error);
            result = [];
          }
        }
        break;

      default:
        // Return all data for comprehensive view
        result = await sql`
          SELECT * FROM vw_lu_choices
          ORDER BY display_order;
        `;
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
