import { NextResponse } from 'next/server';

import { addRentPeriod, getLeaseData, getRentSchedule } from '@/app/api/lease/mock-data';

type Params = { params: Promise<{ id: string }> };

export const GET = async (_request: Request, context: Params) => {
  const { id } = await context.params;
  getLeaseData(id);
  return NextResponse.json(getRentSchedule());
};

export const POST = async (request: Request, context: Params) => {
  const { id } = await context.params;
  const payload = await request.json();
  addRentPeriod({ ...payload, lease_id: Number(id) });
  return NextResponse.json({ ok: true }, { status: 201 });
};
