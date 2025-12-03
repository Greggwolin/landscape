'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProjectContext } from '@/app/components/ProjectProvider';
import NapkinAnalysisPage from '@/components/napkin/NapkinAnalysisPage';

export default function NapkinPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = Number(params.projectId);
  const { projects, isLoading } = useProjectContext();

  // Find the project from the URL, not from activeProject (which might be stale/different)
  const currentProject = projects.find(p => p.project_id === projectId);
  const isDeveloperMode = currentProject?.analysis_mode === 'developer';

  // Redirect to project home if in developer mode
  useEffect(() => {
    if (!isLoading && currentProject && isDeveloperMode) {
      router.push(`/projects/${projectId}`);
    }
  }, [isLoading, currentProject, isDeveloperMode, projectId, router]);

  // Don't conditionally render based on loading - always render NapkinAnalysisPage
  // This prevents unmount/remount cycles that lose React Query data
  // NapkinAnalysisPage handles its own loading state internally
  if (isDeveloperMode) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Redirecting...</span>
        </div>
      </div>
    );
  }

  return <NapkinAnalysisPage projectId={projectId} />;
}
