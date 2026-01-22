'use client';

import React from 'react';
import FlyoutPlaceholder from './FlyoutPlaceholder';

interface FlyoutProps {
  data?: Record<string, unknown>;
}

export default function PlanningFlyout({ data: _data }: FlyoutProps) {
  return (
    <FlyoutPlaceholder
      title="Planning & Phasing"
      icon="📐"
      description="Land planning, phasing, and parcel inputs will appear here."
      note="Landscaper will guide area and phase setup."
    />
  );
}
