'use client';

import React from 'react';
import { useParams } from 'next/navigation';

/**
 * Acquisition Page
 *
 * TODO: Migrate content from one of these sources:
 * Option 1: /projects/[projectId]/components/tabs/ProjectTab.tsx (legacy tab component)
 * Option 2: /projects/[projectId]/project/summary/page.tsx (newer summary page)
 *
 * Should include:
 * - Project profile information (name, location, type, size)
 * - Project map showing location
 * - Acquisition costs and land pricing
 * - Key contacts
 * - Project notes/description
 */
export default function AcquisitionPage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string);

  return (
    <div className="container-fluid px-4">
      <div className="alert alert-info">
        <h5><i className="bi bi-info-circle me-2"></i>Acquisition Page</h5>
        <p className="mb-2">
          This page will display the project profile and acquisition information.
        </p>
        <p className="mb-2"><strong>Content to migrate:</strong></p>
        <ul className="mb-2">
          <li>Project details (name, address, type, size, etc.)</li>
          <li>Project map with property location</li>
          <li>Acquisition cost breakdown</li>
          <li>Land pricing (per acre, per unit)</li>
          <li>Key contacts (owner, broker, team)</li>
          <li>Project description and notes</li>
        </ul>
        <p className="mb-0">
          <strong>Recommended source:</strong> Reuse components from{' '}
          <code>/projects/[projectId]/project/summary/page.tsx</code>
        </p>
      </div>

      {/* Temporary: Basic project info display */}
      <div className="row g-4">
        <div className="col-md-8">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="bi bi-building me-2"></i>
                Project Profile
              </h5>
            </div>
            <div className="card-body">
              <div className="text-center py-5 text-muted">
                <i className="bi bi-file-earmark-text" style={{ fontSize: '3rem' }}></i>
                <p className="mt-3">Project profile component will be displayed here</p>
                <p className="small">Project ID: {projectId}</p>
              </div>
            </div>
          </div>

          <div className="card mt-4">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="bi bi-cash-coin me-2"></i>
                Acquisition Costs
              </h5>
            </div>
            <div className="card-body">
              <div className="text-center py-5 text-muted">
                <i className="bi bi-receipt" style={{ fontSize: '3rem' }}></i>
                <p className="mt-3">Acquisition cost breakdown will be displayed here</p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="bi bi-geo-alt me-2"></i>
                Project Location
              </h5>
            </div>
            <div className="card-body">
              <div className="text-center py-5 text-muted">
                <i className="bi bi-map" style={{ fontSize: '3rem' }}></i>
                <p className="mt-3">Project map will be displayed here</p>
              </div>
            </div>
          </div>

          <div className="card mt-4">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="bi bi-people me-2"></i>
                Key Contacts
              </h5>
            </div>
            <div className="card-body">
              <div className="text-center py-5 text-muted">
                <i className="bi bi-person-lines-fill" style={{ fontSize: '3rem' }}></i>
                <p className="mt-3">Project contacts will be displayed here</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
