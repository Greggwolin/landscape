'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the cost library page
const CostLibraryPage = dynamic(() => import('@/app/admin/benchmarks/cost-library/page'), {
  ssr: false,
});

export default function CostLibraryPanel() {
  return (
    <div>
      <CostLibraryPage />
    </div>
  );
}
