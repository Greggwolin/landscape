import { NextResponse } from 'next/server';

import { addEscalation, getEscalations } from '@/app/api/lease/mock-data';

export const GET = async () => {
  return NextResponse.json(getEscalations());
};

export const POST = async (request: Request, { params }: { params: { id: string } }) => {
  const payload = await request.json();
  addEscalation({ ...payload, lease_id: Number(params.id) });
  return NextResponse.json({ ok: true }, { status: 201 });
};
