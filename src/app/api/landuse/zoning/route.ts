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
        site_coverage_pct,
        site_far,
        max_stories,
        max_height_ft,
        parking_ratio_per1000sf,
        parking_stall_sf,
        site_common_area_pct,
        setback_front_ft,
        setback_side_ft,
        setback_rear_ft,
        created_at,
        updated_at
      FROM landscape.tbl_zoning_control
      WHERE landuse_code = ${landUseCode}
    `;

    if (result.length === 0) {
      return NextResponse.json(null);
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error fetching zoning data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch zoning data' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const { landuse_code, ...zoningData } = data;

    if (!landuse_code) {
      return NextResponse.json(
        { error: 'Land use code is required' },
        { status: 400 }
      );
    }

    // Convert empty strings to null for numeric fields
    const cleanData = Object.fromEntries(
      Object.entries(zoningData).map(([key, value]) => [
        key,
        value === '' || value === undefined ? null : value
      ])
    );

    // Check if record exists
    const existing = await sql`
      SELECT landuse_code FROM landscape.tbl_zoning_control
      WHERE landuse_code = ${landuse_code}
    `;

    let result;
    if (existing.length > 0) {
      // Update existing record
      result = await sql`
        UPDATE landscape.tbl_zoning_control 
        SET 
          site_coverage_pct = ${cleanData.site_coverage_pct},
          site_far = ${cleanData.site_far},
          max_stories = ${cleanData.max_stories},
          max_height_ft = ${cleanData.max_height_ft},
          parking_ratio_per1000sf = ${cleanData.parking_ratio_per1000sf},
          parking_stall_sf = ${cleanData.parking_stall_sf},
          site_common_area_pct = ${cleanData.site_common_area_pct},
          setback_front_ft = ${cleanData.setback_front_ft},
          setback_side_ft = ${cleanData.setback_side_ft},
          setback_rear_ft = ${cleanData.setback_rear_ft}
        WHERE landuse_code = ${landuse_code}
        RETURNING *
      `;
    } else {
      // Insert new record
      result = await sql`
        INSERT INTO landscape.tbl_zoning_control 
        (landuse_code, site_coverage_pct, site_far, max_stories, max_height_ft,
         parking_ratio_per1000sf, parking_stall_sf, site_common_area_pct,
         setback_front_ft, setback_side_ft, setback_rear_ft)
        VALUES (${landuse_code}, ${cleanData.site_coverage_pct}, ${cleanData.site_far}, 
                ${cleanData.max_stories}, ${cleanData.max_height_ft}, 
                ${cleanData.parking_ratio_per1000sf}, ${cleanData.parking_stall_sf}, 
                ${cleanData.site_common_area_pct}, ${cleanData.setback_front_ft}, 
                ${cleanData.setback_side_ft}, ${cleanData.setback_rear_ft})
        RETURNING *
      `;
    }

    return NextResponse.json(result?.[0] || { landuse_code });
  } catch (error) {
    console.error('Error saving zoning data:', error);
    return NextResponse.json(
      { error: 'Failed to save zoning data' },
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
      DELETE FROM landscape.tbl_zoning_control
      WHERE landuse_code = ${landUseCode}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Zoning data not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Zoning data deleted successfully' });
  } catch (error) {
    console.error('Error deleting zoning data:', error);
    return NextResponse.json(
      { error: 'Failed to delete zoning data' },
      { status: 500 }
    );
  }
}