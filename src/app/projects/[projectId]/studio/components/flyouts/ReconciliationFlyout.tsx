'use client';

import React from 'react';
import FlyoutPlaceholder from './FlyoutPlaceholder';

interface FlyoutProps {
  data?: Record<string, unknown>;
}

export default function ReconciliationFlyout({ data: _data }: FlyoutProps) {
  return (
    <FlyoutPlaceholder
      title="Reconciliation"
      icon="⚖️"
      description="Weighting rationale and final value conclusions will appear here."
      note="Landscaper will summarize cross-approach insights and risks."
    />
  );
}
