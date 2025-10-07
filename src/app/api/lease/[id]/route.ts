import { NextResponse } from 'next/server';

import { getLeaseData, setLease } from '@/app/api/lease/mock-data';

export const GET = async (_request: Request, { params }: { params: { id: string } }) => {
  const data = getLeaseData(params.id);
  return NextResponse.json(data);
};

export const PUT = async (request: Request, { params }: { params: { id: string } }) => {
  const payload = await request.json();
  setLease(payload);
  return NextResponse.json({ ok: true, leaseId: params.id });
};

export const DELETE = async (_request: Request, { params }: { params: { id: string } }) => {
  return NextResponse.json({ ok: true, leaseId: params.id });
};
