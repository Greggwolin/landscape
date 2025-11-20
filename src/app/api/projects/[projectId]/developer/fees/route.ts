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
    const fees = await sql`
      SELECT
        id,
        fee_type AS "feeType",
        fee_description AS "feeDescription",
        basis_type AS "basisType",
        basis_value AS "basisValue",
        calculated_amount AS "calculatedAmount",
        payment_timing AS "paymentTiming",
        status,
        notes
      FROM landscape.developer_fees
      WHERE project_id = ${id}
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ fees });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to fetch developer fees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch developer fees', details: message },
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
      INSERT INTO landscape.developer_fees (
        project_id,
        fee_type,
        fee_description,
        basis_type,
        basis_value,
        calculated_amount,
        payment_timing,
        status,
        notes
      )
      VALUES (
        ${id},
        ${body.feeType},
        ${body.feeDescription},
        ${body.basisType},
        ${body.basisValue},
        ${body.calculatedAmount || 0},
        ${body.paymentTiming || null},
        ${body.status || 'pending'},
        ${body.notes || null}
      )
      RETURNING
        id,
        fee_type AS "feeType",
        fee_description AS "feeDescription",
        basis_type AS "basisType",
        basis_value AS "basisValue",
        calculated_amount AS "calculatedAmount",
        payment_timing AS "paymentTiming",
        status,
        notes
    `;

    return NextResponse.json({ success: true, fee: result[0] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to create developer fee:', error);
    return NextResponse.json(
      { error: 'Failed to create developer fee', details: message },
      { status: 500 }
    );
  }
}
