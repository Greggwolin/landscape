'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import PlanningContent from '@/app/components/Planning/PlanningContent';

/**
 * Land Use & Parcels Page
 *
 * Displays parcel-level planning data with area/phase/land-use filtering.
 * Uses the migrated PlanningContent component which includes built-in filters.
 */
export default function LandUsePage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string);

  return <PlanningContent projectId={projectId} />;
}
