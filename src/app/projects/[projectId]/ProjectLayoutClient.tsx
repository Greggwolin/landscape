/**
 * ProjectLayoutClient
 *
 * Two-column layout with ARGUS-style folder tab navigation:
 * - Left column (30%, min 350px, max 450px): Project selector + Landscaper panel
 * - Right column (70%): Folder tabs + content area
 *
 * URL pattern: /projects/[projectId]?folder=valuation&tab=sales
 *
 * @version 2.3
 * @updated 2026-01-23 - Moved project selector into left column above Landscaper
 */

'use client';

import React, { Suspense } from 'react';
import { useProjectContext } from '@/app/components/ProjectProvider';
import { LandscaperPanel } from '@/components/landscaper/LandscaperPanel';
import { ProjectSelectorCard } from '@/components/navigation/ProjectSelectorCard';
import FolderTabs from '@/components/navigation/FolderTabs';
import { useFolderNavigation } from '@/hooks/useFolderNavigation';
import '@/styles/folder-tabs.css';

interface ProjectLayoutClientProps {
  projectId: number;
  children: React.ReactNode;
}

function ProjectLayoutClientInner({ projectId, children }: ProjectLayoutClientProps) {
  const { projects, activeProject, isLoading } = useProjectContext();

  // Find current project
  const currentProject =
    projects.find((p) => p.project_id === projectId) || activeProject;

  // Get folder navigation state
  const {
    currentFolder,
    currentTab,
    setFolderTab,
    folderConfig,
  } = useFolderNavigation({
    propertyType: currentProject?.project_type_code,
  });

  // Handle folder/tab navigation
  const handleNavigate = (folder: string, tab: string) => {
    setFolderTab(folder, tab);
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 min-h-0 gap-2" style={{ alignItems: 'flex-start', padding: '0.25rem 0.5rem 0.5rem 0.25rem' }}>
        <div
          className="flex-shrink-0 sticky top-0 flex flex-col"
          style={{
            width: '30%',
            minWidth: '350px',
            maxWidth: '450px',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--cui-card-bg)',
              borderRadius: '12px',
              padding: '0.75rem 1rem',
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
              marginBottom: '0.75rem',
            }}
          >
            <p style={{ color: 'var(--cui-secondary-color)', margin: 0 }}>Loading...</p>
          </div>
          <div className="folder-content-placeholder" style={{ flex: 1 }}>
            <p>Loading...</p>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="folder-content-placeholder">
            <p>Loading project...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 gap-2" style={{ alignItems: 'flex-start', padding: '0.25rem 0.5rem 0.5rem 0.25rem' }}>
      {/* Left Panel - Project Selector + Landscaper (30%) */}
      <div
        key={`left-panel-${currentFolder}`}
        className="flex-shrink-0 sticky top-0 flex flex-col"
        style={{
          width: '30%',
          minWidth: '350px',
          maxWidth: '450px',
          height: 'calc(100vh - 100px)',
        }}
      >
        {/* Project Selector Card */}
        <ProjectSelectorCard projectId={projectId} />

        {/* Landscaper Panel */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <LandscaperPanel projectId={projectId} activeTab={currentFolder} />
        </div>
      </div>

      {/* Right Content - Folder Tabs + Content (70%) */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Folder Tabs Navigation - replaces the colored tile bar */}
        <FolderTabs
          folders={folderConfig.folders}
          currentFolder={currentFolder}
          currentTab={currentTab}
          onNavigate={handleNavigate}
        />

        {/* Content Area */}
        <div className="studio-folder-content">
          {children}
        </div>
      </div>
    </div>
  );
}

export function ProjectLayoutClient({ projectId, children }: ProjectLayoutClientProps) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 min-h-0 gap-2" style={{ alignItems: 'flex-start', padding: '0.25rem 0.5rem 0.5rem 0.25rem' }}>
          <div
            className="flex-shrink-0 sticky top-0 flex flex-col"
            style={{
              width: '30%',
              minWidth: '350px',
              maxWidth: '450px',
            }}
          >
            <div
              style={{
                backgroundColor: 'var(--cui-card-bg)',
                borderRadius: '12px',
                padding: '0.75rem 1rem',
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                marginBottom: '0.75rem',
              }}
            >
              <p style={{ color: 'var(--cui-secondary-color)', margin: 0 }}>Loading...</p>
            </div>
            <div className="folder-content-placeholder" style={{ flex: 1 }}>
              <p>Loading...</p>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="folder-content-placeholder">
              <p>Loading...</p>
            </div>
          </div>
        </div>
      }
    >
      <ProjectLayoutClientInner projectId={projectId}>
        {children}
      </ProjectLayoutClientInner>
    </Suspense>
  );
}
