'use client';

import React from 'react';
import FlyoutPlaceholder from './FlyoutPlaceholder';

interface FlyoutProps {
  data?: Record<string, unknown>;
}

export default function BudgetFlyout({ data: _data }: FlyoutProps) {
  return (
    <FlyoutPlaceholder
      title="Budget Details"
      icon="💵"
      description="Budget assumptions, schedules, and imports will appear here."
      note="Landscaper will flag missing line items and benchmarks."
    />
  );
}
