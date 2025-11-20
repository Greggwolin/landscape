import { NextResponse } from 'next/server';

import { addEscalation, getEscalations } from '@/app/api/lease/mock-data';

type Params = { params: Promise<{ id: string }> };

export const GET = async () => {
  return NextResponse.json(getEscalations());
};

export const POST = async (request: Request, context: Params) => {
  const { id } = await context.params;
  const payload = await request.json();
  addEscalation({ ...payload, lease_id: Number(id) });
  return NextResponse.json({ ok: true }, { status: 201 });
};
