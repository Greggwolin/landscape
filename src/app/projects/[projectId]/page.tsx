/**
 * Project Page
 *
 * Main entry point for project navigation with folder tabs.
 * Content is routed based on URL query params: ?folder=xxx&tab=yyy
 *
 * @version 2.0
 * @updated 2026-01-23 - Integrated folder tabs navigation
 */

'use client';

// Force dynamic rendering for pages using useSearchParams
export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { useProjectContext } from '@/app/components/ProjectProvider';
import { useFolderNavigation } from '@/hooks/useFolderNavigation';
import StudioContent from './StudioContent';

function ProjectPageInner() {
  const params = useParams();
  const projectId = Number(params.projectId);
  const { projects, activeProject, isLoading } = useProjectContext();

  // Find current project
  const currentProject =
    projects.find((p) => p.project_id === projectId) || activeProject;

  // Get folder navigation state
  const { currentFolder, currentTab, setFolderTab } = useFolderNavigation({
    propertyType: currentProject?.project_type_code,
    analysisType: currentProject?.analysis_type,
  });

  // Show loading state while projects are being fetched
  if (isLoading) {
    return (
      <div className="folder-content-placeholder">
        <p>Loading project...</p>
      </div>
    );
  }

  // Only show "not found" after loading completes
  if (!currentProject) {
    return (
      <div className="folder-content-placeholder">
        <div className="folder-content-placeholder-icon">❓</div>
        <h2>Project Not Found</h2>
        <p>Project ID {projectId} does not exist.</p>
      </div>
    );
  }

  // Route content based on folder/tab
  return (
    <StudioContent
      project={currentProject}
      currentFolder={currentFolder}
      currentTab={currentTab}
      setFolderTab={setFolderTab}
    />
  );
}

export default function ProjectPage() {
  return (
    <Suspense
      fallback={
        <div className="folder-content-placeholder">
          <p>Loading...</p>
        </div>
      }
    >
      <ProjectPageInner />
    </Suspense>
  );
}
