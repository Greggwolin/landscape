'use client';

import React from 'react';
import FlyoutPlaceholder from './FlyoutPlaceholder';

interface FlyoutProps {
  data?: Record<string, unknown>;
}

export default function PropertyFlyout({ data: _data }: FlyoutProps) {
  return (
    <FlyoutPlaceholder
      title="Property Data"
      icon="🏢"
      description="Site, building, and unit inputs will appear here."
      note="Landscaper will highlight missing documents and data gaps."
    />
  );
}
