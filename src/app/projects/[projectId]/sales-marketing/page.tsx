'use client';

import React from 'react';
import { useParams } from 'next/navigation';

/**
 * Sales & Marketing Page
 *
 * Placeholder: This will be the existing sales-absorption content moved/renamed here.
 * TODO: Move content from /projects/[projectId]/sales-absorption/* to this location
 */
export default function SalesMarketingPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  return (
    <div className="container-fluid px-4">
      <div className="alert alert-warning">
        <h5><i className="bi bi-exclamation-triangle me-2"></i>Page Migration In Progress</h5>
        <p className="mb-0">
          The existing Sales & Absorption content will be moved/renamed here.
          <br />
          <strong>Source:</strong> <code>/projects/{projectId}/sales-absorption/*</code>
          <br />
          <strong>Destination:</strong> <code>/projects/{projectId}/sales-marketing/page.tsx</code>
        </p>
      </div>

      <div className="card">
        <div className="card-body text-center py-5">
          <i className="bi bi-cart-check" style={{ fontSize: '4rem', color: '#ccc' }}></i>
          <h4 className="mt-3">Sales & Marketing</h4>
          <p className="text-muted">
            Sales tracking, marketing spend, lot releases, and absorption analysis will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
