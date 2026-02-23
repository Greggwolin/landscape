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
import ProjectContentRouter from './ProjectContentRouter';

function ProjectPageInner() {
  const params = useParams();
  const projectId = Number(params.projectId);
  const { projects, activeProject, isLoading } = useProjectContext();

  // Find current project
  const currentProject =
    projects.find((p) => p.project_id === projectId) || activeProject;

  // Get folder navigation state
  // Use project_type_code (canonical short code like 'RET', 'MF') for category routing.
  // property_subtype (e.g. 'RETAIL_NNN') is a lookup code, not recognized by getProjectCategory().
  const effectivePropertyType = currentProject?.project_type_code
    || currentProject?.project_type
    || currentProject?.property_subtype;

  const { currentFolder, currentTab, setFolderTab } = useFolderNavigation({
    propertyType: effectivePropertyType,
    analysisType: currentProject?.analysis_type,
    analysisPerspective: currentProject?.analysis_perspective,
    analysisPurpose: currentProject?.analysis_purpose,
    valueAddEnabled: currentProject?.value_add_enabled ?? false,
    tileConfig: currentProject?.tile_config,
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
    <ProjectContentRouter
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
