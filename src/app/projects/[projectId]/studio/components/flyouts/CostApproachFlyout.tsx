'use client';

import React from 'react';
import FlyoutPlaceholder from './FlyoutPlaceholder';

interface FlyoutProps {
  data?: Record<string, unknown>;
}

export default function CostApproachFlyout({ data: _data }: FlyoutProps) {
  return (
    <FlyoutPlaceholder
      title="Cost Approach"
      icon="🏗️"
      description="Land value, replacement cost, and depreciation inputs will appear here."
      note="Landscaper will guide you through cost estimation methodology."
    />
  );
}
