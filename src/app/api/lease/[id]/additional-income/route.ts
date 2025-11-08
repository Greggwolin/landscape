import { NextResponse } from 'next/server';

import { getLeaseData, updateAdditionalIncome } from '@/app/api/lease/mock-data';

type Params = { params: Promise<{ id: string }> };

export const GET = async (_request: Request, context: Params) => {
  const lease = getLeaseData((await context.params).id);
  return NextResponse.json(lease.additionalIncome);
};

export const PUT = async (request: Request) => {
  const payload = await request.json();
  updateAdditionalIncome(payload);
  return NextResponse.json({ ok: true });
};
