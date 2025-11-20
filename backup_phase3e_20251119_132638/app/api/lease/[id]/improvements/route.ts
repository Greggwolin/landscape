import { NextResponse } from 'next/server';

import { getLeaseData, updateImprovements } from '@/app/api/lease/mock-data';

type Params = { params: Promise<{ id: string }> };

export const GET = async (_request: Request, context: Params) => {
  const lease = getLeaseData((await context.params).id);
  return NextResponse.json(lease.improvements);
};

export const PUT = async (request: Request) => {
  const payload = await request.json();
  updateImprovements(payload);
  return NextResponse.json({ ok: true });
};
