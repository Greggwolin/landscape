'use client';

import React from 'react';
import FlyoutPlaceholder from './FlyoutPlaceholder';

interface FlyoutProps {
  data?: Record<string, unknown>;
}

export default function SalesFlyout({ data: _data }: FlyoutProps) {
  return (
    <FlyoutPlaceholder
      title="Sales & Absorption"
      icon="📈"
      description="Absorption, pricing, and inventory inputs will appear here."
      note="Landscaper will highlight pacing risks and adjustments."
    />
  );
}
