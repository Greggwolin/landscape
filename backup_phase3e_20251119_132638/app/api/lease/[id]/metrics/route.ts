import { NextResponse } from 'next/server';

import { getMetrics } from '@/app/api/lease/mock-data';

export const GET = async () => {
  return NextResponse.json(getMetrics());
};
