import { NextResponse } from 'next/server';

import { getTimeline } from '@/app/api/lease/mock-data';

export const GET = async () => {
  return NextResponse.json(getTimeline());
};
