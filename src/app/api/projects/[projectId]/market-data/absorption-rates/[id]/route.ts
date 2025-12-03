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
  const { projectId, id: compId } = await params;
  const projId = Number(projectId);
  const cId = Number(compId);

  if (!Number.isFinite(projId) || !Number.isFinite(cId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { project_name, location, product_type, monthly_absorption, annual_absorption, date_reported } = body;

    const result = await sql`
      UPDATE landscape.market_data_absorption_rates
      SET
        project_name = ${project_name},
        location = ${location},
        product_type = ${product_type},
        monthly_absorption = ${monthly_absorption},
        annual_absorption = ${annual_absorption},
        date_reported = ${date_reported}
      WHERE project_id = ${projId}
        AND comp_id = ${cId}
      RETURNING comp_id AS id, project_name, location, product_type, monthly_absorption, annual_absorption, date_reported
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Comparable not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, comparable: result[0] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to update absorption rate:', error);
    return NextResponse.json(
      { error: 'Failed to update absorption rate', details: message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { projectId, id: compId } = await params;
  const projId = Number(projectId);
  const cId = Number(compId);

  if (!Number.isFinite(projId) || !Number.isFinite(cId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    await sql`
      DELETE FROM landscape.market_data_absorption_rates
      WHERE project_id = ${projId}
        AND comp_id = ${cId}
    `;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to delete absorption rate:', error);
    return NextResponse.json(
      { error: 'Failed to delete absorption rate', details: message },
      { status: 500 }
    );
  }
}
