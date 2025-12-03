'use client';

import MarketAssumptions from '@/app/components/MarketAssumptions';

const DEFAULT_PROJECT_ID = 9; // Peoria Meadows

export default function MarketAssumptionsSandboxPage() {
  return <MarketAssumptions projectId={DEFAULT_PROJECT_ID} />;
}
