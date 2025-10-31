'use client';

import React from 'react';
import PlanningContent from '@/app/components/Planning/PlanningContent';

/**
 * Standalone Planning Page
 *
 * Provides direct access to the Planning interface with full CRUD for:
 * - Areas (Level 1 tiles)
 * - Phases (Level 2 tiles)
 * - Parcels (full table below with 42+ parcels in Peoria Lakes)
 *
 * Defaults to Peoria Lakes (project_id = 7) with 4 areas defined.
 */
export default function PlanningPage() {
  // Default to Peoria Lakes project (project_id = 7)
  const DEFAULT_PROJECT_ID = 7;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
      <PlanningContent projectId={DEFAULT_PROJECT_ID} />
    </div>
  );
}
