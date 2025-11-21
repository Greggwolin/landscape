'use client';

import React from 'react';
import { useParams } from 'next/navigation';

/**
 * Land Use & Parcels Page
 *
 * Placeholder: This will be the existing Planning page content moved here.
 * TODO: Move content from /projects/[projectId]/planning/page.tsx to this location
 */
export default function LandUsePage() {
  const params = useParams();
  const projectId = params.projectId as string;

  return (
    <div className="container-fluid">
      <div className="alert alert-warning">
        <h5><i className="bi bi-exclamation-triangle me-2"></i>Page Migration In Progress</h5>
        <p className="mb-0">
          The existing Planning page content will be moved here.
          <br />
          <strong>Source:</strong> <code>/projects/{projectId}/planning/page.tsx</code>
          <br />
          <strong>Destination:</strong> <code>/projects/{projectId}/planning/land-use/page.tsx</code>
        </p>
      </div>

      <div className="card">
        <div className="card-body text-center py-5">
          <i className="bi bi-map" style={{ fontSize: '4rem', color: '#ccc' }}></i>
          <h4 className="mt-3">Land Use & Parcels</h4>
          <p className="text-muted">
            Content from existing Planning page will appear here after migration.
          </p>
        </div>
      </div>
    </div>
  );
}
