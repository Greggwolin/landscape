'use client';

import React from 'react';
import FlyoutPlaceholder from './FlyoutPlaceholder';

interface FlyoutProps {
  data?: Record<string, unknown>;
}

export default function ReportsFlyout({ data: _data }: FlyoutProps) {
  return (
    <FlyoutPlaceholder
      title="Reports"
      icon="📄"
      description="Report configuration and deliverable status will appear here."
      note="Landscaper will help validate report completeness."
    />
  );
}
