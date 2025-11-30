'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import FeasibilitySubNav from '@/components/feasibility/FeasibilitySubNav';
import SensitivityAnalysisContent from '@/components/feasibility/SensitivityAnalysisContent';
import { ExportButton } from '@/components/admin';

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
      <div className="container-fluid py-4">
        {/* Page Header */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">Feasibility</h5>
          <ExportButton tabName="Feasibility" projectId={projectId.toString()} />
        </div>
        <SensitivityAnalysisContent projectId={projectId} />
      </div>
    </>
  );
}
