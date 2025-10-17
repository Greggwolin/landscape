import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET /api/projects/:projectId/assumptions/acquisition
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = parseInt(params.projectId);

    const result = await sql`
      SELECT * FROM landscape.tbl_property_acquisition
      WHERE project_id = ${projectId}
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      // Return empty defaults if no assumptions saved yet
      return NextResponse.json({
        project_id: projectId,
        purchase_price: null,
        acquisition_date: null,
        hold_period_years: 7.0,
        exit_cap_rate: 0.055,
        sale_date: null,
        closing_costs_pct: 0.015,
        due_diligence_days: 30,
        earnest_money: null,
        sale_costs_pct: 0.015,
        broker_commission_pct: 0.025,
        price_per_unit: null,
        price_per_sf: null,
        legal_fees: null,
        financing_fees: null,
        third_party_reports: null,
        depreciation_basis: null,
        land_pct: 20.0,
        improvement_pct: 80.0,
        is_1031_exchange: false
      });
    }

    return NextResponse.json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching acquisition assumptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch acquisition assumptions' },
      { status: 500 }
    );
  }
}

// POST /api/projects/:projectId/assumptions/acquisition
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = parseInt(params.projectId);
    const data = await request.json();

    // Check if record exists
    const existing = await sql`
      SELECT acquisition_id FROM landscape.tbl_property_acquisition
      WHERE project_id = ${projectId}
    `;

    if (existing.rows.length > 0) {
      // UPDATE existing record
      const result = await sql`
        UPDATE landscape.tbl_property_acquisition
        SET
          purchase_price = ${data.purchase_price},
          acquisition_date = ${data.acquisition_date},
          hold_period_years = ${data.hold_period_years},
          exit_cap_rate = ${data.exit_cap_rate},
          sale_date = ${data.sale_date},
          closing_costs_pct = ${data.closing_costs_pct},
          due_diligence_days = ${data.due_diligence_days},
          earnest_money = ${data.earnest_money},
          sale_costs_pct = ${data.sale_costs_pct},
          broker_commission_pct = ${data.broker_commission_pct},
          price_per_unit = ${data.price_per_unit},
          price_per_sf = ${data.price_per_sf},
          legal_fees = ${data.legal_fees},
          financing_fees = ${data.financing_fees},
          third_party_reports = ${data.third_party_reports},
          depreciation_basis = ${data.depreciation_basis},
          land_pct = ${data.land_pct},
          improvement_pct = ${data.improvement_pct},
          is_1031_exchange = ${data.is_1031_exchange},
          updated_at = NOW()
        WHERE project_id = ${projectId}
        RETURNING *
      `;

      return NextResponse.json(result.rows[0]);

    } else {
      // INSERT new record
      const result = await sql`
        INSERT INTO landscape.tbl_property_acquisition (
          project_id, purchase_price, acquisition_date, hold_period_years,
          exit_cap_rate, sale_date, closing_costs_pct, due_diligence_days,
          earnest_money, sale_costs_pct, broker_commission_pct, price_per_unit,
          price_per_sf, legal_fees, financing_fees, third_party_reports,
          depreciation_basis, land_pct, improvement_pct, is_1031_exchange
        ) VALUES (
          ${projectId}, ${data.purchase_price}, ${data.acquisition_date},
          ${data.hold_period_years}, ${data.exit_cap_rate}, ${data.sale_date},
          ${data.closing_costs_pct}, ${data.due_diligence_days}, ${data.earnest_money},
          ${data.sale_costs_pct}, ${data.broker_commission_pct}, ${data.price_per_unit},
          ${data.price_per_sf}, ${data.legal_fees}, ${data.financing_fees},
          ${data.third_party_reports}, ${data.depreciation_basis}, ${data.land_pct},
          ${data.improvement_pct}, ${data.is_1031_exchange}
        )
        RETURNING *
      `;

      return NextResponse.json(result.rows[0], { status: 201 });
    }

  } catch (error) {
    console.error('Error saving acquisition assumptions:', error);
    return NextResponse.json(
      { error: 'Failed to save acquisition assumptions' },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/:projectId/assumptions/acquisition (partial update)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = parseInt(params.projectId);
    const data = await request.json();

    // Build dynamic SET clause for only provided fields
    const setFields: string[] = [];
    const values: (string | number | boolean | null)[] = [];
    let valueIndex = 1;

    Object.keys(data).forEach(key => {
      if (key !== 'project_id' && key !== 'acquisition_id' && key !== 'created_at' && key !== 'updated_at') {
        setFields.push(`${key} = $${valueIndex}`);
        values.push(data[key]);
        valueIndex++;
      }
    });

    if (setFields.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Add updated_at
    setFields.push(`updated_at = NOW()`);

    const query = `
      UPDATE landscape.tbl_property_acquisition
      SET ${setFields.join(', ')}
      WHERE project_id = $${valueIndex}
      RETURNING *
    `;

    values.push(projectId);

    const result = await sql.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'No record found to update' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);

  } catch (error) {
    console.error('Error updating acquisition assumptions:', error);
    return NextResponse.json(
      { error: 'Failed to update acquisition assumptions' },
      { status: 500 }
    );
  }
}
