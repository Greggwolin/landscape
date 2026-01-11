import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

type Params = { params: { projectId: string } };

export type RentalComp = {
  id: number;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  distance: number | null;
  yearBuilt: number | null;
  totalUnits: number | null;
  unitType: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  askingRent: number;
  effectiveRent: number | null;
  dataSource: string | null;
  asOfDate: string;
};

export type RentalCompsResponse = {
  projectId: number;
  comps: RentalComp[];
};

export async function GET(req: NextRequest, context: Params) {
  const { projectId: projectIdRaw } = context.params;
  const projectId = Number.parseInt(projectIdRaw, 10);

  if (!Number.isInteger(projectId) || projectId <= 0) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 });
  }

  try {
    const sql = neon(process.env.NEON_DB_URL!);

    const rows = await sql`
      SELECT
        comparable_id,
        property_name,
        address,
        latitude,
        longitude,
        distance_miles,
        year_built,
        total_units,
        unit_type,
        bedrooms,
        bathrooms,
        avg_sqft,
        asking_rent,
        effective_rent,
        data_source,
        as_of_date
      FROM tbl_rental_comparable
      WHERE project_id = ${projectId}
        AND is_active = true
      ORDER BY distance_miles ASC NULLS LAST
    `;

    const comps: RentalComp[] = rows.map((row) => ({
      id: row.comparable_id,
      name: row.property_name,
      address: row.address,
      lat: row.latitude ? Number(row.latitude) : null,
      lng: row.longitude ? Number(row.longitude) : null,
      distance: row.distance_miles ? Number(row.distance_miles) : null,
      yearBuilt: row.year_built,
      totalUnits: row.total_units,
      unitType: row.unit_type,
      bedrooms: Number(row.bedrooms),
      bathrooms: Number(row.bathrooms),
      sqft: row.avg_sqft,
      askingRent: Number(row.asking_rent),
      effectiveRent: row.effective_rent ? Number(row.effective_rent) : null,
      dataSource: row.data_source,
      asOfDate: row.as_of_date
    }));

    const response: RentalCompsResponse = {
      projectId,
      comps
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    });
  } catch (error) {
    console.error('Failed to fetch rental comps', error);
    return NextResponse.json(
      { error: 'Failed to fetch rental comps' },
      { status: 500 }
    );
  }
}
