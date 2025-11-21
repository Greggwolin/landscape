'use client';

import React from 'react';
import { useParams } from 'next/navigation';

/**
 * Acquisition Page
 *
 * Placeholder: This will be the existing project profile/summary content moved here.
 * TODO: Move content from /projects/[projectId]/page.tsx to this location
 */
export default function AcquisitionPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  return (
    <div className="container-fluid px-4">
      <div className="alert alert-warning">
        <h5><i className="bi bi-exclamation-triangle me-2"></i>Page Migration In Progress</h5>
        <p className="mb-0">
          The existing project profile/summary content will be moved here.
          <br />
          <strong>Source:</strong> <code>/projects/{projectId}/page.tsx</code>
          <br />
          <strong>Destination:</strong> <code>/projects/{projectId}/acquisition/page.tsx</code>
        </p>
      </div>

      <div className="card">
        <div className="card-body text-center py-5">
          <i className="bi bi-building" style={{ fontSize: '4rem', color: '#ccc' }}></i>
          <h4 className="mt-3">Acquisition</h4>
          <p className="text-muted">
            Project profile, map, and acquisition costs will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
