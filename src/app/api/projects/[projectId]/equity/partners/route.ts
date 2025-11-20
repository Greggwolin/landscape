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
    const partners = await sql`
      SELECT
        id,
        partner_name AS "partnerName",
        partner_type AS "partnerType",
        capital_committed AS "capitalCommitted",
        capital_deployed AS "capitalDeployed",
        ownership_percent AS "ownershipPercent",
        preferred_return AS "preferredReturn",
        investment_date AS "investmentDate",
        notes
      FROM landscape.equity_partners
      WHERE project_id = ${id}
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ partners });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to fetch partners:', error);
    return NextResponse.json(
      { error: 'Failed to fetch partners', details: message },
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
      INSERT INTO landscape.equity_partners (
        project_id,
        partner_name,
        partner_type,
        capital_committed,
        capital_deployed,
        ownership_percent,
        preferred_return,
        investment_date,
        notes
      )
      VALUES (
        ${id},
        ${body.partnerName},
        ${body.partnerType},
        ${body.capitalCommitted},
        ${body.capitalDeployed || 0},
        ${body.ownershipPercent},
        ${body.preferredReturn || null},
        ${body.investmentDate || null},
        ${body.notes || null}
      )
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

    return NextResponse.json({ success: true, partner: result[0] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to create partner:', error);
    return NextResponse.json(
      { error: 'Failed to create partner', details: message },
      { status: 500 }
    );
  }
}
