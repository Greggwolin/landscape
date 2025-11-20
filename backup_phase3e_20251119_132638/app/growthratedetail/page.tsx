'use client';

import { useState } from 'react';
import GrowthRateDetail from '@/app/components/GrowthRateDetail';
import { CButton } from '@coreui/react';

export default function GrowthRateDetailSandboxPage() {
  const [visible, setVisible] = useState(true);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 py-10">
      <h1 className="text-2xl font-semibold text-white">Growth Rate Detail Sandbox</h1>
      <p className="text-sm text-slate-300">
        Use this sandbox to experiment with the GrowthRateDetail component.
      </p>
      <CButton color="primary" onClick={() => setVisible(true)}>
        Open Detail Modal
      </CButton>
      {visible && <GrowthRateDetail onClose={() => setVisible(false)} />}
    </div>
  );
}
