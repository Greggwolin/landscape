// app/api/density-classifications/route.ts
// API endpoint for density classification data

import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export async function GET(request: Request) {
  try {
    // For now, return hardcoded density classifications until the database schema is updated
    const defaultDensityClassifications = [
      // Residential densities
      {
        id: 1,
        code: 'VLDR',
        name: 'Very Low Density Residential',
        description: 'Large lot single family',
        min_density: 0.1,
        max_density: 1,
        units: 'units/acre',
        active: true,
        family_category: 'residential'
      },
      {
        id: 2,
        code: 'LDR',
        name: 'Low Density Residential',
        description: 'Single family detached',
        min_density: 1,
        max_density: 3,
        units: 'units/acre',
        active: true,
        family_category: 'residential'
      },
      {
        id: 3,
        code: 'MDR',
        name: 'Medium Density Residential',
        description: 'Small lot single family, townhomes',
        min_density: 4,
        max_density: 8,
        units: 'units/acre',
        active: true,
        family_category: 'residential'
      },
      {
        id: 4,
        code: 'HDR',
        name: 'High Density Residential',
        description: 'Apartments, condos',
        min_density: 12,
        max_density: 25,
        units: 'units/acre',
        active: true,
        family_category: 'residential'
      },
      {
        id: 5,
        code: 'VHDR',
        name: 'Very High Density Residential',
        description: 'High-rise residential',
        min_density: 25,
        max_density: 100,
        units: 'units/acre',
        active: true,
        family_category: 'residential'
      },
      // Commercial densities
      {
        id: 6,
        code: 'LIC',
        name: 'Low Intensity Commercial',
        description: 'Neighborhood commercial',
        min_density: 0.1,
        max_density: 0.5,
        units: 'FAR',
        active: true,
        family_category: 'commercial'
      },
      {
        id: 7,
        code: 'MIC',
        name: 'Medium Intensity Commercial',
        description: 'Regional commercial',
        min_density: 0.5,
        max_density: 2.0,
        units: 'FAR',
        active: true,
        family_category: 'commercial'
      },
      {
        id: 8,
        code: 'HIC',
        name: 'High Intensity Commercial',
        description: 'Urban commercial',
        min_density: 2.0,
        max_density: 8.0,
        units: 'FAR',
        active: true,
        family_category: 'commercial'
      },
      // Mixed use densities
      {
        id: 9,
        code: 'LIMU',
        name: 'Low Intensity Mixed Use',
        description: 'Neighborhood mixed use',
        min_density: 5,
        max_density: 15,
        units: 'units/acre',
        active: true,
        family_category: 'mixed'
      },
      {
        id: 10,
        code: 'HIMU',
        name: 'High Intensity Mixed Use',
        description: 'Urban mixed use',
        min_density: 15,
        max_density: 50,
        units: 'units/acre',
        active: true,
        family_category: 'mixed'
      }
    ];

    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');
    const familyCategory = searchParams.get('family_category');

    let result = defaultDensityClassifications;
    if (active === 'true') {
      result = result.filter(item => item.active);
    }
    if (familyCategory) {
      result = result.filter(item => item.family_category === familyCategory);
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Density classifications API error:', error);
    return NextResponse.json({
      error: 'Failed to fetch density classifications',
      details: message
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, name, description, min_density, max_density, units } = body;

    // Validate required fields
    if (!code || !name || !units) {
      return NextResponse.json({
        error: 'Missing required fields: code, name, units'
      }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO landscape.density_classification
      (code, name, description, min_density, max_density, units, active)
      VALUES (${code}, ${name}, ${description || null}, ${min_density || null}, ${max_density || null}, ${units}, true)
      RETURNING *;
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Create density classification error:', error);
    return NextResponse.json({
      error: 'Failed to create density classification',
      details: message
    }, { status: 500 });
  }
}