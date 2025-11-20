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
      UPDATE landscape.debt_facilities
      SET
        facility_name = ${body.facilityName},
        lender = ${body.lender},
        facility_type = ${body.facilityType},
        commitment_amount = ${body.commitmentAmount},
        outstanding_balance = ${body.outstandingBalance || 0},
        interest_rate = ${body.interestRate},
        maturity_date = ${body.maturityDate},
        status = ${body.status || 'active'},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${facilityId}
        AND project_id = ${projectIdNum}
      RETURNING
        id,
        facility_name AS "facilityName",
        lender,
        facility_type AS "facilityType",
        commitment_amount AS "commitmentAmount",
        outstanding_balance AS "outstandingBalance",
        interest_rate AS "interestRate",
        maturity_date AS "maturityDate",
        status
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
      DELETE FROM landscape.debt_facilities
      WHERE id = ${facilityId}
        AND project_id = ${projectIdNum}
      RETURNING id
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
