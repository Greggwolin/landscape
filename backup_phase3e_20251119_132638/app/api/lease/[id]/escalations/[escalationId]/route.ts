import { NextResponse } from 'next/server';

import { deleteEscalation, updateEscalation } from '@/app/api/lease/mock-data';

type Params = { params: Promise<{ id: string; escalationId: string }> };

export const PUT = async (request: Request, context: Params) => {
  const { escalationId } = await context.params;
  const payload = await request.json();
  updateEscalation(Number(escalationId), payload);
  return NextResponse.json({ ok: true });
};

export const DELETE = async (_request: Request, context: Params) => {
  const { escalationId } = await context.params;
  deleteEscalation(Number(escalationId));
  return NextResponse.json({ ok: true });
};
