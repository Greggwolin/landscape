'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import ProjectContextBar from '@/app/components/ProjectContextBar';
import { CAlert } from '@coreui/react';

/**
 * Project Summary Page
 *
 * Phase 1 Placeholder - Will be populated in future phases
 * This page will contain project overview, key metrics, and status.
 */
export default function ProjectSummaryPage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string);

  return (
    <>
      <ProjectContextBar projectId={projectId} />
      <div className="container py-4">
        <div className="row">
          <div className="col-12">
            <h1 className="h3 mb-4">Project Summary</h1>
            <CAlert color="info">
              <h5>Phase 1: Navigation Shell</h5>
              <p className="mb-0">
                This page is a placeholder for the PROJECT tab. In future phases, this will display:
              </p>
              <ul className="mt-2 mb-0">
                <li>Project overview and key metrics</li>
                <li>Planning interface</li>
                <li>Budget management</li>
                <li>Operations tracking</li>
                <li>Sales & Absorption data</li>
              </ul>
            </CAlert>
          </div>
        </div>
      </div>
    </>
  );
}
