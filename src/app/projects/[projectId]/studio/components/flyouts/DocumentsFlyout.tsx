'use client';

import React from 'react';
import FlyoutPlaceholder from './FlyoutPlaceholder';

interface FlyoutProps {
  data?: Record<string, unknown>;
}

export default function DocumentsFlyout({ data: _data }: FlyoutProps) {
  return (
    <FlyoutPlaceholder
      title="Documents"
      icon="📁"
      description="Document intake, tagging, and review tasks will appear here."
      note="Landscaper will surface files that need action."
    />
  );
}
