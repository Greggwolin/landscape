import { NextResponse } from 'next/server';

import { getLeaseData, updateImprovements } from '@/app/api/lease/mock-data';

export const GET = async (_request: Request, { params }: { params: { id: string } }) => {
  const lease = getLeaseData(params.id);
  return NextResponse.json(lease.improvements);
};

export const PUT = async (request: Request) => {
  const payload = await request.json();
  updateImprovements(payload);
  return NextResponse.json({ ok: true });
};
