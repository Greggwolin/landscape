import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type Params = { params: Promise<{ projectId: string }> };

export async function GET(
  _request: NextRequest,
  context: Params
) {
  const { projectId } = await context.params;
  const projectIdNum = parseInt(projectId);

  const activeResult = await sql`
    SELECT active_opex_discriminator
    FROM landscape.tbl_project
    WHERE project_id = ${projectIdNum}
    LIMIT 1
  `;
  const availableResult = await sql`
    SELECT DISTINCT statement_discriminator
    FROM landscape.tbl_operating_expenses
    WHERE project_id = ${projectIdNum}
  `;

  return NextResponse.json({
    project_id: projectIdNum,
    active_statement_discriminator: activeResult.rows[0]?.active_opex_discriminator || 'default',
    available_statement_discriminators: availableResult.rows.map(r => r.statement_discriminator).filter(Boolean)
  });
}

export async function PUT(
  request: NextRequest,
  context: Params
) {
  const { projectId } = await context.params;
  const projectIdNum = parseInt(projectId);
  const body = await request.json();
  const { statement_discriminator: requested } = body || {};

  if (!requested) {
    return NextResponse.json({ error: 'statement_discriminator is required' }, { status: 400 });
  }

  const availableResult = await sql`
    SELECT DISTINCT statement_discriminator
    FROM landscape.tbl_operating_expenses
    WHERE project_id = ${projectIdNum}
  `;
  const available = availableResult.rows.map(r => r.statement_discriminator).filter(Boolean);
  if (!available.includes(requested)) {
    return NextResponse.json(
      { error: `No OpEx rows found for discriminator ${requested}` },
      { status: 400 }
    );
  }

  await sql`
    UPDATE landscape.tbl_project
    SET active_opex_discriminator = ${requested}, updated_at = NOW()
    WHERE project_id = ${projectIdNum}
  `;

  return NextResponse.json({
    project_id: projectIdNum,
    active_statement_discriminator: requested,
    available_statement_discriminators: available
  });
}
