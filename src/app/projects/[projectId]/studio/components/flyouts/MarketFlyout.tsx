'use client';

import React from 'react';
import FlyoutPlaceholder from './FlyoutPlaceholder';

interface FlyoutProps {
  data?: Record<string, unknown>;
}

export default function MarketFlyout({ data: _data }: FlyoutProps) {
  return (
    <FlyoutPlaceholder
      title="Market Analysis"
      icon="📊"
      description="Market comps, trends, and submarket intelligence will appear here."
      note="Landscaper will surface relevant data sources and benchmarks."
    />
  );
}
