// app/api/landuse/families/route.ts
// API endpoint for land use families

import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

export async function GET(request: Request) {
  try {
    // Return hardcoded families for now until database schema is updated
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

    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');

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