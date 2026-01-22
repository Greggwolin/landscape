'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { CCard, CCardBody, CCardHeader } from '@coreui/react';

export default function StudioOverviewPage() {
  const params = useParams();
  const projectId = Number(params.projectId);

  return (
    <div className="p-6">
      <CCard
        style={{
          backgroundColor: 'var(--studio-surface-card)',
          borderColor: 'var(--studio-border-soft)',
        }}
      >
        <CCardHeader
          style={{
            backgroundColor: 'var(--studio-surface-elevated)',
            borderBottom: '1px solid var(--studio-border-soft)',
            color: 'var(--studio-text-primary)',
          }}
        >
          <strong>Project Overview</strong>
        </CCardHeader>
        <CCardBody>
          <p style={{ color: 'var(--studio-text-secondary)' }}>
            Project ID: {projectId}
          </p>
          <p style={{ color: 'var(--studio-text-muted)', marginTop: '8px' }}>
            Placeholder — will integrate existing component
          </p>
        </CCardBody>
      </CCard>
    </div>
  );
}
