'use client';

import React from 'react';
import FlyoutPlaceholder from './FlyoutPlaceholder';

interface FlyoutProps {
  data?: Record<string, unknown>;
}

export default function IncomeApproachFlyout({ data: _data }: FlyoutProps) {
  return (
    <FlyoutPlaceholder
      title="Income Approach"
      icon="🏦"
      description="Cap rates, NOI, and DCF assumptions will appear here."
      note="Landscaper will surface market cap rate guidance and sensitivity checks."
    />
  );
}
