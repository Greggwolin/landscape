import { NextResponse } from 'next/server';

import { addRentPeriod, getLeaseData, getRentSchedule } from '@/app/api/lease/mock-data';

export const GET = async (_request: Request, { params }: { params: { id: string } }) => {
  getLeaseData(params.id);
  return NextResponse.json(getRentSchedule());
};

export const POST = async (request: Request, { params }: { params: { id: string } }) => {
  const payload = await request.json();
  addRentPeriod({ ...payload, lease_id: Number(params.id) });
  return NextResponse.json({ ok: true }, { status: 201 });
};
