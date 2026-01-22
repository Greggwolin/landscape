'use client';

import React from 'react';
import FlyoutPlaceholder from './FlyoutPlaceholder';

interface FlyoutProps {
  data?: Record<string, unknown>;
}

export default function ProjectSetupFlyout({ data: _data }: FlyoutProps) {
  return (
    <FlyoutPlaceholder
      title="Project Setup"
      icon="🧩"
      description="Project metadata and setup guidance will appear here."
      note="Landscaper will prompt you for missing project details."
    />
  );
}
