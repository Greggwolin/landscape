import { NextResponse } from 'next/server';

import { getLeaseData, updateMarketAssumptions } from '@/app/api/lease/mock-data';

type Params = { params: Promise<{ id: string }> };

export const GET = async (_request: Request, context: Params) => {
  const lease = getLeaseData((await context.params).id);
  return NextResponse.json(lease.marketAssumptions);
};

export const PUT = async (request: Request) => {
  const payload = await request.json();
  updateMarketAssumptions(payload);
  return NextResponse.json({ ok: true });
};
