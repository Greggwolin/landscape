import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type Params = { params: Promise<{ projectId: string }> };

// GET /api/projects/:projectId/assumptions/revenue
export async function GET(
  request: NextRequest,
  context: Params
) {
  try {
    const projectId = parseInt((await context.params).projectId);

    // Fetch all revenue-related tables
    const [rentData, otherIncomeData, vacancyData] = await Promise.all([
      sql`SELECT * FROM landscape.tbl_revenue_rent WHERE project_id = ${projectId} LIMIT 1`,
      sql`SELECT * FROM landscape.tbl_revenue_other WHERE project_id = ${projectId} LIMIT 1`,
      sql`SELECT * FROM landscape.tbl_vacancy_assumption WHERE project_id = ${projectId} LIMIT 1`
    ]);

    return NextResponse.json({
      rent: rentData.rows[0] || null,
      other_income: otherIncomeData.rows[0] || null,
      vacancy: vacancyData.rows[0] || null
    });

  } catch (error) {
    console.error('Error fetching revenue assumptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch revenue assumptions' },
      { status: 500 }
    );
  }
}

// POST /api/projects/:projectId/assumptions/revenue
export async function POST(
  request: NextRequest,
  context: Params
) {
  try {
    const projectId = parseInt((await context.params).projectId);
    const data = await request.json();

    const results: Record<string, unknown> = {};

    // Handle rent data
    if (data.rent) {
      const existingRent = await sql`
        SELECT rent_id FROM landscape.tbl_revenue_rent WHERE project_id = ${projectId}
      `;

      if (existingRent.rows.length > 0) {
        const result = await sql`
          UPDATE landscape.tbl_revenue_rent
          SET
            current_rent_psf = ${data.rent.current_rent_psf},
            occupancy_pct = ${data.rent.occupancy_pct},
            annual_rent_growth_pct = ${data.rent.annual_rent_growth_pct},
            in_place_rent_psf = ${data.rent.in_place_rent_psf},
            market_rent_psf = ${data.rent.market_rent_psf},
            rent_loss_to_lease_pct = ${data.rent.rent_loss_to_lease_pct},
            lease_up_months = ${data.rent.lease_up_months},
            stabilized_occupancy_pct = ${data.rent.stabilized_occupancy_pct},
            rent_growth_years_1_3_pct = ${data.rent.rent_growth_years_1_3_pct},
            rent_growth_stabilized_pct = ${data.rent.rent_growth_stabilized_pct},
            free_rent_months = ${data.rent.free_rent_months},
            ti_allowance_per_unit = ${data.rent.ti_allowance_per_unit},
            renewal_probability_pct = ${data.rent.renewal_probability_pct},
            updated_at = NOW()
          WHERE project_id = ${projectId}
          RETURNING *
        `;
        results.rent = result.rows[0];
      } else {
        const result = await sql`
          INSERT INTO landscape.tbl_revenue_rent (
            project_id, current_rent_psf, occupancy_pct, annual_rent_growth_pct,
            in_place_rent_psf, market_rent_psf, rent_loss_to_lease_pct,
            lease_up_months, stabilized_occupancy_pct, rent_growth_years_1_3_pct,
            rent_growth_stabilized_pct, free_rent_months, ti_allowance_per_unit,
            renewal_probability_pct
          ) VALUES (
            ${projectId}, ${data.rent.current_rent_psf}, ${data.rent.occupancy_pct},
            ${data.rent.annual_rent_growth_pct}, ${data.rent.in_place_rent_psf},
            ${data.rent.market_rent_psf}, ${data.rent.rent_loss_to_lease_pct},
            ${data.rent.lease_up_months}, ${data.rent.stabilized_occupancy_pct},
            ${data.rent.rent_growth_years_1_3_pct}, ${data.rent.rent_growth_stabilized_pct},
            ${data.rent.free_rent_months}, ${data.rent.ti_allowance_per_unit},
            ${data.rent.renewal_probability_pct}
          )
          RETURNING *
        `;
        results.rent = result.rows[0];
      }
    }

    // Handle other income data
    if (data.other_income) {
      const existingOther = await sql`
        SELECT other_income_id FROM landscape.tbl_revenue_other WHERE project_id = ${projectId}
      `;

      if (existingOther.rows.length > 0) {
        const result = await sql`
          UPDATE landscape.tbl_revenue_other
          SET
            other_income_per_unit_monthly = ${data.other_income.other_income_per_unit_monthly},
            parking_income_per_space = ${data.other_income.parking_income_per_space},
            parking_spaces = ${data.other_income.parking_spaces},
            pet_fee_per_pet = ${data.other_income.pet_fee_per_pet},
            pet_penetration_pct = ${data.other_income.pet_penetration_pct},
            laundry_income_per_unit = ${data.other_income.laundry_income_per_unit},
            storage_income_per_unit = ${data.other_income.storage_income_per_unit},
            application_fees_annual = ${data.other_income.application_fees_annual},
            updated_at = NOW()
          WHERE project_id = ${projectId}
          RETURNING *
        `;
        results.other_income = result.rows[0];
      } else {
        const result = await sql`
          INSERT INTO landscape.tbl_revenue_other (
            project_id, other_income_per_unit_monthly, parking_income_per_space,
            parking_spaces, pet_fee_per_pet, pet_penetration_pct,
            laundry_income_per_unit, storage_income_per_unit, application_fees_annual
          ) VALUES (
            ${projectId}, ${data.other_income.other_income_per_unit_monthly},
            ${data.other_income.parking_income_per_space}, ${data.other_income.parking_spaces},
            ${data.other_income.pet_fee_per_pet}, ${data.other_income.pet_penetration_pct},
            ${data.other_income.laundry_income_per_unit}, ${data.other_income.storage_income_per_unit},
            ${data.other_income.application_fees_annual}
          )
          RETURNING *
        `;
        results.other_income = result.rows[0];
      }
    }

    // Handle vacancy data
    if (data.vacancy) {
      const existingVacancy = await sql`
        SELECT vacancy_id FROM landscape.tbl_vacancy_assumption WHERE project_id = ${projectId}
      `;

      if (existingVacancy.rows.length > 0) {
        const result = await sql`
          UPDATE landscape.tbl_vacancy_assumption
          SET
            vacancy_loss_pct = ${data.vacancy.vacancy_loss_pct},
            collection_loss_pct = ${data.vacancy.collection_loss_pct},
            physical_vacancy_pct = ${data.vacancy.physical_vacancy_pct},
            economic_vacancy_pct = ${data.vacancy.economic_vacancy_pct},
            bad_debt_pct = ${data.vacancy.bad_debt_pct},
            concession_cost_pct = ${data.vacancy.concession_cost_pct},
            turnover_vacancy_days = ${data.vacancy.turnover_vacancy_days},
            updated_at = NOW()
          WHERE project_id = ${projectId}
          RETURNING *
        `;
        results.vacancy = result.rows[0];
      } else {
        const result = await sql`
          INSERT INTO landscape.tbl_vacancy_assumption (
            project_id, vacancy_loss_pct, collection_loss_pct,
            physical_vacancy_pct, economic_vacancy_pct, bad_debt_pct,
            concession_cost_pct, turnover_vacancy_days
          ) VALUES (
            ${projectId}, ${data.vacancy.vacancy_loss_pct}, ${data.vacancy.collection_loss_pct},
            ${data.vacancy.physical_vacancy_pct}, ${data.vacancy.economic_vacancy_pct},
            ${data.vacancy.bad_debt_pct}, ${data.vacancy.concession_cost_pct},
            ${data.vacancy.turnover_vacancy_days}
          )
          RETURNING *
        `;
        results.vacancy = result.rows[0];
      }
    }

    return NextResponse.json(results);

  } catch (error) {
    console.error('Error saving revenue assumptions:', error);
    return NextResponse.json(
      { error: 'Failed to save revenue assumptions' },
      { status: 500 }
    );
  }
}
