'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import AcquisitionLedgerGrid from '@/components/acquisition/AcquisitionLedgerGrid';
import { usePreference } from '@/hooks/useUserPreferences';
import type { BudgetMode } from '@/components/budget/ModeSelector';

export default function AcquisitionPage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string);

  // Mode state with database persistence via usePreference hook
  const [mode, setMode] = usePreference<BudgetMode>({
    key: 'acquisition.mode',
    defaultValue: 'napkin',
    scopeType: 'project',
    scopeId: projectId,
    migrateFrom: `acquisition_mode_${projectId}`, // Auto-migrate from old localStorage key
  });

  return (
    <div className="app-content" style={{ backgroundColor: 'var(--cui-body-bg)' }}>
      <AcquisitionLedgerGrid
        projectId={projectId}
        mode={mode}
        onModeChange={setMode}
      />
    </div>
  );
}
