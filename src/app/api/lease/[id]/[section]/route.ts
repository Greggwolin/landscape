import { NextResponse } from 'next/server';

import { getLeaseData, updateLeaseSection } from '@/app/api/lease/mock-data';

type Params = { params: Promise<{ id: string; section: string }> };

export const PUT = async (request: Request, context: Params) => {
  const { id, section } = await context.params;
  const lease = getLeaseData(id);
  if (!(section in lease)) {
    return NextResponse.json({ error: `Unknown section ${section}` }, { status: 400 });
  }

  const payload = await request.json();
  const existing = lease[section as keyof typeof lease];

  if (Array.isArray(existing)) {
    updateLeaseSection(section as keyof typeof lease, 'value' in payload ? payload.value : payload);
  } else if ('field' in payload && 'value' in payload) {
    updateLeaseSection(section as keyof typeof lease, { [payload.field]: payload.value });
  } else {
    updateLeaseSection(section as keyof typeof lease, payload);
  }

  return NextResponse.json({ ok: true });
};

export const GET = async (_request: Request, context: Params) => {
  const { id, section: sectionKey } = await context.params;
  const lease = getLeaseData(id);
  const section = lease[sectionKey as keyof typeof lease];
  if (section === undefined) {
    return NextResponse.json({ error: `Unknown section ${sectionKey}` }, { status: 404 });
  }
  return NextResponse.json(section);
};
