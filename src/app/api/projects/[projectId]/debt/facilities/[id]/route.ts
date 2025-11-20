import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type Params = {
  projectId: string;
  id: string;
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { projectId, id } = await params;
  const projectIdNum = Number(projectId);
  const facilityId = Number(id);

  if (!Number.isFinite(projectIdNum) || !Number.isFinite(facilityId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const body = await request.json();

    const result = await sql`
      UPDATE landscape.tbl_debt_facility
      SET
        facility_name = ${body.facilityName},
        lender_name = ${body.lender},
        facility_type = ${body.facilityType},
        commitment_amount = ${body.commitmentAmount},
        drawn_to_date = ${body.outstandingBalance || 0},
        interest_rate = ${body.interestRate},
        maturity_date = ${body.maturityDate}
      WHERE facility_id = ${facilityId}
        AND project_id = ${projectIdNum}
      RETURNING
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
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Facility not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, facility: result[0] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to update facility:', error);
    return NextResponse.json(
      { error: 'Failed to update facility', details: message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { projectId, id } = await params;
  const projectIdNum = Number(projectId);
  const facilityId = Number(id);

  if (!Number.isFinite(projectIdNum) || !Number.isFinite(facilityId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const result = await sql`
      DELETE FROM landscape.tbl_debt_facility
      WHERE facility_id = ${facilityId}
        AND project_id = ${projectIdNum}
      RETURNING facility_id as id
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Facility not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to delete facility:', error);
    return NextResponse.json(
      { error: 'Failed to delete facility', details: message },
      { status: 500 }
    );
  }
}
