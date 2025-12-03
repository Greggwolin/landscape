import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type Params = {
  projectId: string;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { projectId } = await params;
  const id = Number(projectId);

  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }

  try {
    const facilities = await sql`
      SELECT
        facility_id as id,
        facility_name AS "facilityName",
        lender_name as lender,
        facility_type AS "facilityType",
        commitment_amount AS "commitmentAmount",
        drawn_to_date AS "outstandingBalance",
        interest_rate AS "interestRate",
        maturity_date AS "maturityDate",
        CASE
          WHEN maturity_date < CURRENT_DATE THEN 'closed'
          WHEN commitment_date IS NULL THEN 'pending'
          ELSE 'active'
        END as status
      FROM landscape.tbl_debt_facility
      WHERE project_id = ${id}
      ORDER BY commitment_date DESC NULLS LAST, facility_id DESC
    `;

    return NextResponse.json({ facilities });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to fetch facilities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch facilities', details: message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { projectId } = await params;
  const id = Number(projectId);

  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }

  try {
    const body = await request.json();

    const result = await sql`
      INSERT INTO landscape.tbl_debt_facility (
        project_id,
        facility_name,
        lender_name,
        facility_type,
        commitment_amount,
        drawn_to_date,
        interest_rate,
        maturity_date,
        commitment_date,
        interest_calculation,
        payment_frequency,
        interest_payment_method
      )
      VALUES (
        ${id},
        ${body.facilityName},
        ${body.lender},
        ${body.facilityType || 'CONSTRUCTION'},
        ${body.commitmentAmount},
        ${body.outstandingBalance || 0},
        ${body.interestRate},
        ${body.maturityDate},
        CURRENT_DATE,
        'SIMPLE',
        'MONTHLY',
        'accrued_simple'
      )
      RETURNING
        facility_id as id,
        facility_name AS "facilityName",
        lender_name as lender,
        facility_type AS "facilityType",
        commitment_amount AS "commitmentAmount",
        drawn_to_date AS "outstandingBalance",
        interest_rate AS "interestRate",
        maturity_date AS "maturityDate",
        'active' as status
    `;

    return NextResponse.json({ success: true, facility: result[0] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to create facility:', error);
    return NextResponse.json(
      { error: 'Failed to create facility', details: message },
      { status: 500 }
    );
  }
}
