'use client';

import React from 'react';
import FlyoutPlaceholder from './FlyoutPlaceholder';

interface FlyoutProps {
  data?: Record<string, unknown>;
}

export default function FeasibilityFlyout({ data: _data }: FlyoutProps) {
  return (
    <FlyoutPlaceholder
      title="Feasibility Analysis"
      icon="🎯"
      description="Residual land value and cash flow inputs will appear here."
      note="Landscaper will summarize feasibility sensitivities."
    />
  );
}
