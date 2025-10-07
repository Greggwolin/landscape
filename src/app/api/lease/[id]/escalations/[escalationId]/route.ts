import { NextResponse } from 'next/server';

import { deleteEscalation, updateEscalation } from '@/app/api/lease/mock-data';

export const PUT = async (request: Request, { params }: { params: { escalationId: string } }) => {
  const payload = await request.json();
  updateEscalation(Number(params.escalationId), payload);
  return NextResponse.json({ ok: true });
};

export const DELETE = async (_request: Request, { params }: { params: { escalationId: string } }) => {
  deleteEscalation(Number(params.escalationId));
  return NextResponse.json({ ok: true });
};
