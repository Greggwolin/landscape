'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import ProjectContextBar from '@/app/components/ProjectContextBar';
import { CAlert } from '@coreui/react';

/**
 * Documents - Files Page
 *
 * Phase 1 Placeholder - Will integrate with DMS in Phase 6
 */
export default function DocumentsFilesPage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string);

  return (
    <>
      <ProjectContextBar projectId={projectId} />
      <div className="container py-4">
        <div className="row">
          <div className="col-12">
            <h1 className="h3 mb-4">Project Documents</h1>
            <CAlert color="info">
              <h5>Phase 6: Documents Tab</h5>
              <p className="mb-0">
                This page will be implemented in Phase 6. It will include:
              </p>
              <ul className="mt-2 mb-0">
                <li>Project-specific document library</li>
                <li>Document management system (DMS) integration</li>
                <li>Report generation and export</li>
                <li>File upload and organization</li>
              </ul>
            </CAlert>
          </div>
        </div>
      </div>
    </>
  );
}
