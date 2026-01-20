'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { DocumentIngestion } from '@/components/ingestion';
import { useIngestionData } from '@/hooks/useIngestionData';
import { CSpinner } from '@coreui/react';

// Chadron Terrace Garden Apartments project ID
const CHADRON_PROJECT_ID = 17;

function IngestionPageContent() {
  const searchParams = useSearchParams();
  // Default to Chadron if no projectId specified
  const rawProjectId = searchParams.get('projectId');
  const projectId = rawProjectId ? parseInt(rawProjectId, 10) : CHADRON_PROJECT_ID;

  const {
    project,
    summary,
    documents,
    milestones,
    isLoading,
    error,
  } = useIngestionData(projectId);

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100" style={{ background: 'var(--cui-dark-bg-subtle)' }}>
        <div className="text-center">
          <CSpinner color="primary" className="mb-3" />
          <div className="text-body-secondary">Loading property data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100" style={{ background: 'var(--cui-dark-bg-subtle)' }}>
        <div className="text-center text-danger">
          <p>Error loading property data</p>
          <p className="small">{error}</p>
        </div>
      </div>
    );
  }

  const projectName = project?.name || searchParams.get('projectName') || 'Unknown Property';

  return (
    <DocumentIngestion
      projectId={projectId}
      projectName={projectName}
      initialDocuments={documents}
      initialSummary={summary}
      initialMilestones={milestones}
      onAnalysisReady={() => {
        console.log('Ready for analysis!');
        // Navigate to analysis page
      }}
    />
  );
}

/**
 * Document Ingestion Page
 *
 * CopilotKit-powered HITL interface for multifamily document ingestion.
 *
 * Usage:
 * /ingestion?projectId=123&projectName=Parkview%20Apartments
 */
export default function IngestionPage() {
  return (
    <Suspense
      fallback={
        <div className="d-flex justify-content-center align-items-center vh-100">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      }
    >
      <IngestionPageContent />
    </Suspense>
  );
}
