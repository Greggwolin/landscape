'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import ProjectContextBar from '@/app/components/ProjectContextBar';
import { CAlert } from '@coreui/react';

/**
 * Capitalization - Debt Page
 *
 * Phase 1 Placeholder - Will be populated in Phase 5
 */
export default function DebtPage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string);

  return (
    <>
      <ProjectContextBar projectId={projectId} />
      <div className="container py-4">
        <div className="row">
          <div className="col-12">
            <h1 className="h3 mb-4">Debt Financing</h1>
            <CAlert color="info">
              <h5>Phase 5: Capitalization Tab</h5>
              <p className="mb-0">
                This page will be implemented in Phase 5. It will include:
              </p>
              <ul className="mt-2 mb-0">
                <li>Debt facility management</li>
                <li>Draw schedules</li>
                <li>Interest calculations</li>
                <li>Loan covenants tracking</li>
              </ul>
            </CAlert>
          </div>
        </div>
      </div>
    </>
  );
}
