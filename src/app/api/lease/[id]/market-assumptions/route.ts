import { NextResponse } from 'next/server';

import { getLeaseData, updateMarketAssumptions } from '@/app/api/lease/mock-data';

export const GET = async (_request: Request, { params }: { params: { id: string } }) => {
  const lease = getLeaseData(params.id);
  return NextResponse.json(lease.marketAssumptions);
};

export const PUT = async (request: Request) => {
  const payload = await request.json();
  updateMarketAssumptions(payload);
  return NextResponse.json({ ok: true });
};
