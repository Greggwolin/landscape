'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import FeasibilitySubNav from '@/components/feasibility/FeasibilitySubNav';
import SensitivityAnalysisContent from '@/components/feasibility/SensitivityAnalysisContent';

/**
 * Sensitivity Analysis Page
 *
 * Phase 4: Feasibility/Valuation Tab - Sensitivity Analysis subtab
 *
 * Route: /projects/[projectId]/feasibility/sensitivity
 *
 * Features:
 * - Assumption sliders (±100% range)
 * - Real-time IRR/NPV calculation (debounced 300ms)
 * - Impact metric cards (Land Value, IRR, NPV)
 * - Negative land value warning
 * - Save/load scenarios
 */
export default function SensitivityAnalysisPage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string);

  return (
    <>
      <FeasibilitySubNav projectId={projectId} />
      <SensitivityAnalysisContent projectId={projectId} />
    </>
  );
}
