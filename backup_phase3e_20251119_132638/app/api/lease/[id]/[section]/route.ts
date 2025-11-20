import { NextResponse } from 'next/server';

import { getLeaseData, updateLeaseSection } from '@/app/api/lease/mock-data';

type Params = { params: Promise<{ id: string; section: string }> };

export const PUT = async (request: Request, context: Params) => {
  const lease = getLeaseData((await context.params).id);
  if (!(params.section in lease)) {
    return NextResponse.json({ error: `Unknown section ${params.section}` }, { status: 400 });
  }

  const payload = await request.json();
  const existing = lease[(await context.params).section as keyof typeof lease];

  if (Array.isArray(existing)) {
    updateLeaseSection(params.section as keyof typeof lease, 'value' in payload ? payload.value : payload);
  } else if ('field' in payload && 'value' in payload) {
    updateLeaseSection(params.section as keyof typeof lease, { [payload.field]: payload.value });
  } else {
    updateLeaseSection(params.section as keyof typeof lease, payload);
  }

  return NextResponse.json({ ok: true });
};

export const GET = async (_request: Request, context: Params) => {
  const lease = getLeaseData((await context.params).id);
  const section = lease[(await context.params).section as keyof typeof lease];
  if (section === undefined) {
    return NextResponse.json({ error: `Unknown section ${params.section}` }, { status: 404 });
  }
  return NextResponse.json(section);
};
