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
        id,
        facility_name AS "facilityName",
        lender,
        facility_type AS "facilityType",
        commitment_amount AS "commitmentAmount",
        outstanding_balance AS "outstandingBalance",
        interest_rate AS "interestRate",
        maturity_date AS "maturityDate",
        status
      FROM landscape.debt_facilities
      WHERE project_id = ${id}
      ORDER BY created_at DESC
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
      INSERT INTO landscape.debt_facilities (
        project_id,
        facility_name,
        lender,
        facility_type,
        commitment_amount,
        outstanding_balance,
        interest_rate,
        maturity_date,
        status
      )
      VALUES (
        ${id},
        ${body.facilityName},
        ${body.lender},
        ${body.facilityType},
        ${body.commitmentAmount},
        ${body.outstandingBalance || 0},
        ${body.interestRate},
        ${body.maturityDate},
        ${body.status || 'active'}
      )
      RETURNING *
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
