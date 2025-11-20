'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import ProjectContextBar from '@/app/components/ProjectContextBar';
import { CAlert } from '@coreui/react';

/**
 * Feasibility/Valuation - Market Data Page
 *
 * Phase 1 Placeholder - Will be populated in Phase 4
 */
export default function MarketDataPage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string);

  return (
    <>
      <ProjectContextBar projectId={projectId} />
      <div className="container py-4">
        <div className="row">
          <div className="col-12">
            <h1 className="h3 mb-4">Market Data</h1>
            <CAlert color="info">
              <h5>Phase 4: Feasibility/Valuation Tab</h5>
              <p className="mb-0">
                This page will be implemented in Phase 4. It will include:
              </p>
              <ul className="mt-2 mb-0">
                <li>Market data analysis</li>
                <li>Comparable properties</li>
                <li>Valuation models</li>
                <li>Sensitivity analysis</li>
              </ul>
            </CAlert>
          </div>
        </div>
      </div>
    </>
  );
}
