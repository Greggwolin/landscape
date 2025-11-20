import { NextResponse } from 'next/server';

import { getLeaseData, updateRecoveries } from '@/app/api/lease/mock-data';

type Params = { params: Promise<{ id: string }> };

export const GET = async (_request: Request, context: Params) => {
  const lease = getLeaseData((await context.params).id);
  return NextResponse.json(lease.recoveries);
};

export const PUT = async (request: Request) => {
  const payload = await request.json();
  updateRecoveries(payload);
  return NextResponse.json({ ok: true });
};
