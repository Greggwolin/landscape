import { NextResponse } from 'next/server';

import { deleteRentPeriod, updateRentPeriod } from '@/app/api/lease/mock-data';

export const PUT = async (request: Request, { params }: { params: { periodId: string } }) => {
  const payload = await request.json();
  updateRentPeriod(Number(params.periodId), payload);
  return NextResponse.json({ ok: true });
};

export const DELETE = async (_request: Request, { params }: { params: { periodId: string } }) => {
  deleteRentPeriod(Number(params.periodId));
  return NextResponse.json({ ok: true });
};
