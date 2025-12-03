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
  const feeId = Number(id);

  if (!Number.isFinite(projectIdNum) || !Number.isFinite(feeId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const body = await request.json();

    const result = await sql`
      UPDATE landscape.developer_fees
      SET
        fee_type = ${body.feeType},
        fee_description = ${body.feeDescription},
        basis_type = ${body.basisType},
        basis_value = ${body.basisValue},
        calculated_amount = ${body.calculatedAmount || 0},
        payment_timing = ${body.paymentTiming || null},
        status = ${body.status || 'pending'},
        notes = ${body.notes || null},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${feeId}
        AND project_id = ${projectIdNum}
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

    if (result.length === 0) {
      return NextResponse.json({ error: 'Developer fee not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, fee: result[0] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to update developer fee:', error);
    return NextResponse.json(
      { error: 'Failed to update developer fee', details: message },
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
  const feeId = Number(id);

  if (!Number.isFinite(projectIdNum) || !Number.isFinite(feeId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const result = await sql`
      DELETE FROM landscape.developer_fees
      WHERE id = ${feeId}
        AND project_id = ${projectIdNum}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Developer fee not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to delete developer fee:', error);
    return NextResponse.json(
      { error: 'Failed to delete developer fee', details: message },
      { status: 500 }
    );
  }
}
