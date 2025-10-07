import { NextResponse } from 'next/server';

import { getLeaseData, updateAdditionalIncome } from '@/app/api/lease/mock-data';

export const GET = async (_request: Request, { params }: { params: { id: string } }) => {
  const lease = getLeaseData(params.id);
  return NextResponse.json(lease.additionalIncome);
};

export const PUT = async (request: Request) => {
  const payload = await request.json();
  updateAdditionalIncome(payload);
  return NextResponse.json({ ok: true });
};
