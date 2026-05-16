/**
 * Project Page
 *
 * Main entry point for project navigation with folder tabs.
 * Content is routed based on URL query params: ?folder=xxx&tab=yyy
 *
 * @version 2.1
 * @updated 2026-01-23 - Integrated folder tabs navigation
 * @updated 2026-03-01 - Added fallback fetch when project not in SWR cache
 */

'use client';

// Force dynamic rendering for pages using useSearchParams
export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useProjectContext, type ProjectSummary } from '@/app/components/ProjectProvider';
import { useFolderNavigation } from '@/hooks/useFolderNavigation';
import ProjectContentRouter from './ProjectContentRouter';

import { getAuthHeaders } from '@/lib/authHeaders';
function ProjectPageInner() {
  const params = useParams();
  const projectId = Number(params.projectId);
  const { projects, activeProject, isLoading } = useProjectContext();

  // Fallback fetch state — fires when project is not in SWR cache
  const [fallbackProject, setFallbackProject] = useState<ProjectSummary | null>(null);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const fallbackAttempted = useRef(false);

  // Find current project from cache
  const projectFromCache =
    projects.find((p) => p.project_id === projectId) || (activeProject?.project_id === projectId ? activeProject : null);

  // Reset fallback state when projectId changes
  useEffect(() => {
    setFallbackProject(null);
    setFallbackLoading(false);
    setFallbackFailed(false);
    fallbackAttempted.current = false;
  }, [projectId]);

  // Fallback: fetch project directly by ID when not in cache
  useEffect(() => {
    if (projectFromCache || isLoading || fallbackAttempted.current) return;

    fallbackAttempted.current = true;
    setFallbackLoading(true);

    fetch(`/api/projects/${projectId}`, { headers: getAuthHeaders() })
      .then(res => {
        if (!res.ok) return Promise.reject(res.status);
        return res.json();
      })
      .then((data: ProjectSummary) => {
        setFallbackProject(data);
        setFallbackLoading(false);
      })
      .catch(() => {
        setFallbackFailed(true);
        setFallbackLoading(false);
      });
  }, [projectFromCache, isLoading, projectId]);

  // Use cached project if available, otherwise fallback
  const currentProject = projectFromCache ?? fallbackProject;

  // Get folder navigation state
  // Use project_type_code (canonical short code like 'RET', 'MF') for category routing.
  // property_subtype (e.g. 'RETAIL_NNN') is a lookup code, not recognized by getProjectCategory().
  const effectivePropertyType = currentProject?.project_type_code
    || currentProject?.project_type
    || currentProject?.property_subtype;

  const { currentFolder, currentTab, setFolderTab } = useFolderNavigation({
    propertyType: effectivePropertyType ?? undefined,
    analysisType: currentProject?.analysis_type ?? undefined,
    analysisPerspective: currentProject?.analysis_perspective,
    analysisPurpose: currentProject?.analysis_purpose,
    valueAddEnabled: currentProject?.value_add_enabled ?? false,
    tileConfig: currentProject?.tile_config,
  });

  // Show loading state while projects are being fetched OR fallback is in progress
  if (isLoading || fallbackLoading) {
    return (
      <div className="folder-content-placeholder">
        <p>Loading project...</p>
      </div>
    );
  }

  // Only show "not found" after both cache lookup AND fallback fetch have failed
  if (!currentProject && fallbackFailed) {
    return (
      <div className="folder-content-placeholder">
        <div className="folder-content-placeholder-icon">&#10067;</div>
        <h2>Project Not Found</h2>
        <p>Project ID {projectId} does not exist.</p>
      </div>
    );
  }

  // Brief intermediate state before fallback fires (should be <1 frame)
  if (!currentProject) {
    return (
      <div className="folder-content-placeholder">
        <p>Loading project...</p>
      </div>
    );
  }

  // Route content based on folder/tab
  // ProjectSummary has nullable fields (string | null) while ProjectContentRouter's
  // Project interface uses (string | undefined). Both are structurally compatible
  // at runtime. This is a pre-existing type mismatch across the codebase.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const routerProject = currentProject as any;
  return (
    <ProjectContentRouter
      project={routerProject}
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
