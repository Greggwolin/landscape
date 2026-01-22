'use client';

import React from 'react';
import FlyoutPlaceholder from './FlyoutPlaceholder';

interface FlyoutProps {
  data?: Record<string, unknown>;
}

export default function HBUFlyout({ data: _data }: FlyoutProps) {
  return (
    <FlyoutPlaceholder
      title="Highest & Best Use"
      icon="🧭"
      description="Legal, physical, and financial tests will appear here."
      note="Landscaper will guide scenario selection and conclusions."
    />
  );
}
