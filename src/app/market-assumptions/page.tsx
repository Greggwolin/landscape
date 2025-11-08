'use client';

import MarketAssumptions from '@/app/components/MarketAssumptions';

const DEFAULT_PROJECT_ID = 7; // Peoria Lakes

export default function MarketAssumptionsSandboxPage() {
  return <MarketAssumptions projectId={DEFAULT_PROJECT_ID} />;
}
