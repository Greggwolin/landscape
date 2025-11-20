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
  const partnerId = Number(id);

  if (!Number.isFinite(projectIdNum) || !Number.isFinite(partnerId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const body = await request.json();

    const result = await sql`
      UPDATE landscape.equity_partners
      SET
        partner_name = ${body.partnerName},
        partner_type = ${body.partnerType},
        capital_committed = ${body.capitalCommitted},
        capital_deployed = ${body.capitalDeployed || 0},
        ownership_percent = ${body.ownershipPercent},
        preferred_return = ${body.preferredReturn || null},
        investment_date = ${body.investmentDate || null},
        notes = ${body.notes || null},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${partnerId}
        AND project_id = ${projectIdNum}
      RETURNING
        id,
        partner_name AS "partnerName",
        partner_type AS "partnerType",
        capital_committed AS "capitalCommitted",
        capital_deployed AS "capitalDeployed",
        ownership_percent AS "ownershipPercent",
        preferred_return AS "preferredReturn",
        investment_date AS "investmentDate",
        notes
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, partner: result[0] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to update partner:', error);
    return NextResponse.json(
      { error: 'Failed to update partner', details: message },
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
  const partnerId = Number(id);

  if (!Number.isFinite(projectIdNum) || !Number.isFinite(partnerId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const result = await sql`
      DELETE FROM landscape.equity_partners
      WHERE id = ${partnerId}
        AND project_id = ${projectIdNum}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to delete partner:', error);
    return NextResponse.json(
      { error: 'Failed to delete partner', details: message },
      { status: 500 }
    );
  }
}
