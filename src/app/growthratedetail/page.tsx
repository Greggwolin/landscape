'use client';

import { useState } from 'react';
import GrowthRateDetail from '@/app/components/GrowthRateDetail';
import { SemanticButton } from '@/components/ui/landscape';

export default function GrowthRateDetailSandboxPage() {
  const [visible, setVisible] = useState(true);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 py-10">
      <h1 className="text-2xl font-semibold text-white">Growth Rate Detail Sandbox</h1>
      <p className="text-sm text-slate-300">
        Use this sandbox to experiment with the GrowthRateDetail component.
      </p>
      <SemanticButton intent="primary-action" onClick={() => setVisible(true)}>
        Open Detail Modal
      </SemanticButton>
      {visible && <GrowthRateDetail onClose={() => setVisible(false)} />}
    </div>
  );
}
