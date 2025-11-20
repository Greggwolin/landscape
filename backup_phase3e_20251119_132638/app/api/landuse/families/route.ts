// app/api/landuse/families/route.ts
// API endpoint for land use families

import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');

    // First try to fetch from database
    try {
      const families = active === 'true'
        ? await sql`
            SELECT
              family_id,
              name as family_name,
              name,
              name as family_code,
              name as code,
              active as family_active,
              'general' as density_category
            FROM landscape.lu_family
            WHERE active = true
            ORDER BY family_id
          `
        : await sql`
            SELECT
              family_id,
              name as family_name,
              name,
              name as family_code,
              name as code,
              active as family_active,
              'general' as density_category
            FROM landscape.lu_family
            ORDER BY family_id
          `;

      if (families && families.length > 0) {
        return NextResponse.json(families);
      }
    } catch (dbError) {
      console.warn('Failed to fetch families from database, falling back to defaults:', dbError);
    }

    // Fallback to hardcoded families if database query fails
    const defaultFamilies = [
      {
        family_id: 1,
        code: 'RES',
        family_code: 'RES',
        name: 'Residential',
        family_name: 'Residential',
        family_active: true,
        density_category: 'residential'
      },
      {
        family_id: 2,
        code: 'COM',
        family_code: 'COM',
        name: 'Commercial',
        family_name: 'Commercial',
        family_active: true,
        density_category: 'commercial'
      },
      {
        family_id: 3,
        code: 'IND',
        family_code: 'IND',
        name: 'Industrial',
        family_name: 'Industrial',
        family_active: true,
        density_category: 'industrial'
      },
      {
        family_id: 4,
        code: 'OFF',
        family_code: 'OFF',
        name: 'Office',
        family_name: 'Office',
        family_active: true,
        density_category: 'office'
      },
      {
        family_id: 5,
        code: 'MF',
        family_code: 'MF',
        name: 'Multi-Family',
        family_name: 'Multi-Family',
        family_active: true,
        density_category: 'residential'
      },
      {
        family_id: 9,
        code: 'MU',
        family_code: 'MU',
        name: 'Mixed Use',
        family_name: 'Mixed Use',
        family_active: true,
        density_category: 'mixed'
      },
      {
        family_id: 10,
        code: 'OS',
        family_code: 'OS',
        name: 'Open Space',
        family_name: 'Open Space',
        family_active: true,
        density_category: 'open_space'
      }
    ];

    let result = defaultFamilies;
    if (active === 'true') {
      result = result.filter(item => item.family_active);
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Land use families API error:', error);
    return NextResponse.json({
      error: 'Failed to fetch land use families',
      details: message
    }, { status: 500 });
  }
}