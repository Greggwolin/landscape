import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const landUseCode = searchParams.get('code');

    if (!landUseCode) {
      return NextResponse.json(
        { error: 'Land use code is required' },
        { status: 400 }
      );
    }

    const result = await sql`
      SELECT 
        landuse_code,
        rsf_to_gfa_eff,
        employee_density,
        floor_plate_efficiency,
        clear_height_ft,
        loading_dock_ratio,
        truck_court_depth_ft,
        trailer_parking_ratio,
        dwelling_units_per_acre,
        average_unit_size_sf,
        created_at,
        updated_at
      FROM landscape.tbl_landuse_program
      WHERE landuse_code = ${landUseCode}
    `;

    if (result.length === 0) {
      return NextResponse.json(null);
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error fetching programming data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch programming data' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const { landuse_code, ...programmingData } = data;

    if (!landuse_code) {
      return NextResponse.json(
        { error: 'Land use code is required' },
        { status: 400 }
      );
    }

    // Convert empty strings to null for numeric fields
    const cleanData = Object.fromEntries(
      Object.entries(programmingData).map(([key, value]) => [
        key,
        value === '' || value === undefined ? null : value
      ])
    );

    // Check if record exists
    const existing = await sql`
      SELECT landuse_code FROM landscape.tbl_landuse_program
      WHERE landuse_code = ${landuse_code}
    `;

    let result;
    if (existing.length > 0) {
      // Update existing record
      const updateFields = Object.keys(cleanData)
        .filter(key => cleanData[key] !== undefined)
        .map(key => `${key} = $${key}`)
        .join(', ');

      if (updateFields) {
        result = await sql`
          UPDATE landscape.tbl_landuse_program 
          SET 
            rsf_to_gfa_eff = ${cleanData.rsf_to_gfa_eff},
            employee_density = ${cleanData.employee_density},
            floor_plate_efficiency = ${cleanData.floor_plate_efficiency},
            clear_height_ft = ${cleanData.clear_height_ft},
            loading_dock_ratio = ${cleanData.loading_dock_ratio},
            truck_court_depth_ft = ${cleanData.truck_court_depth_ft},
            trailer_parking_ratio = ${cleanData.trailer_parking_ratio},
            dwelling_units_per_acre = ${cleanData.dwelling_units_per_acre},
            average_unit_size_sf = ${cleanData.average_unit_size_sf}
          WHERE landuse_code = ${landuse_code}
          RETURNING *
        `;
      }
    } else {
      // Insert new record
      result = await sql`
        INSERT INTO landscape.tbl_landuse_program 
        (landuse_code, rsf_to_gfa_eff, employee_density, floor_plate_efficiency,
         clear_height_ft, loading_dock_ratio, truck_court_depth_ft, trailer_parking_ratio,
         dwelling_units_per_acre, average_unit_size_sf)
        VALUES (${landuse_code}, ${cleanData.rsf_to_gfa_eff}, ${cleanData.employee_density}, 
                ${cleanData.floor_plate_efficiency}, ${cleanData.clear_height_ft}, 
                ${cleanData.loading_dock_ratio}, ${cleanData.truck_court_depth_ft}, 
                ${cleanData.trailer_parking_ratio}, ${cleanData.dwelling_units_per_acre}, 
                ${cleanData.average_unit_size_sf})
        RETURNING *
      `;
    }

    return NextResponse.json(result?.[0] || { landuse_code });
  } catch (error) {
    console.error('Error saving programming data:', error);
    return NextResponse.json(
      { error: 'Failed to save programming data' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const landUseCode = searchParams.get('code');

    if (!landUseCode) {
      return NextResponse.json(
        { error: 'Land use code is required' },
        { status: 400 }
      );
    }

    const result = await sql`
      DELETE FROM landscape.tbl_landuse_program
      WHERE landuse_code = ${landUseCode}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Programming data not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Programming data deleted successfully' });
  } catch (error) {
    console.error('Error deleting programming data:', error);
    return NextResponse.json(
      { error: 'Failed to delete programming data' },
      { status: 500 }
    );
  }
}