'use client';

import React from 'react';
import FlyoutPlaceholder from './FlyoutPlaceholder';

interface FlyoutProps {
  data?: Record<string, unknown>;
}

export default function OperationsFlyout({ data: _data }: FlyoutProps) {
  return (
    <FlyoutPlaceholder
      title="Operating Expenses"
      icon="⚙️"
      description="Operating assumptions and COA guidance will appear here."
      note="Landscaper will align expenses with asset type."
    />
  );
}
