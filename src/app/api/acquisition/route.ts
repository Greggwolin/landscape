// app/api/acquisition/route.ts
import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export async function GET() {
  try {
    const result = await sql`
      SELECT 
        a.acquisition_id,
        a.project_id,
        a.event_date,
        a.event_type,
        a.description,
        a.amount,
        a.is_applied_to_purchase,
        a.units_conveyed,
        a.notes,
        c.company_name as seller_name,
        c.contact_person as seller_contact,
        c.email as seller_email,
        c.phone as seller_phone,
        m.measure_code,
        m.measure_name
      FROM landscape.tbl_acquisition a
      LEFT JOIN landscape.tbl_contacts c ON a.contact_id = c.contact_id
      LEFT JOIN landscape.tbl_measures m ON a.measure_id = m.measure_id
      WHERE a.project_id = 7
      ORDER BY a.event_date ASC
    `;

    return NextResponse.json(result || []);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Acquisition API error:', error);
    return NextResponse.json({
      error: 'Failed to fetch acquisition data',
      details: message
    }, { status: 500 });
  }
}