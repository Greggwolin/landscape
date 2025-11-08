import { NextResponse } from 'next/server';

import { deleteRentPeriod, updateRentPeriod } from '@/app/api/lease/mock-data';

type Params = { params: Promise<{ periodId: string }> };

export const PUT = async (request: Request, context: Params) => {
  const { periodId } = await context.params;
  const payload = await request.json();
  updateRentPeriod(Number(periodId), payload);
  return NextResponse.json({ ok: true });
};

export const DELETE = async (_request: Request, context: Params) => {
  const { periodId } = await context.params;
  deleteRentPeriod(Number(periodId));
  return NextResponse.json({ ok: true });
};
