/**
 * ProjectLayoutClient
 *
 * Resizable split-panel layout with ARGUS-style folder tab navigation:
 * - Full-width project bar at top (project selector + collapse toggle)
 * - Left panel: Resizable Landscaper (collapses to icon strip)
 * - Right panel: Folder tabs + content area
 * - Draggable splitter between panels with auto-collapse behavior
 *
 * URL pattern: /projects/[projectId]?folder=valuation&tab=sales
 *
 * @version 3.0
 * @updated 2026-01-28 - Resizable split layout with collapsible Landscaper
 */

'use client';

import React, { Suspense, useState } from 'react';
import { CCard } from '@coreui/react';
import { useProjectContext } from '@/app/components/ProjectProvider';
import { LandscaperPanel } from '@/components/landscaper/LandscaperPanel';
import { StudioProjectBar } from '@/components/studio/StudioProjectBar';
import { CollapsedLandscaperStrip } from '@/components/studio/CollapsedLandscaperStrip';
import { AlphaAssistantFlyout } from '@/components/alpha';
import FolderTabs from '@/components/navigation/FolderTabs';
import { useFolderNavigation } from '@/hooks/useFolderNavigation';
import { useResizablePanel } from '@/hooks/useResizablePanel';
import '@/styles/folder-tabs.css';
import '@/styles/resizable-panel.css';

interface ProjectLayoutClientProps {
  projectId: number;
  children: React.ReactNode;
}

// Resizable splitter constants
const DEFAULT_LANDSCAPER_WIDTH = 320;
const MIN_LANDSCAPER_WIDTH = 280;
const MAX_WIDTH_PERCENT = 50;
const COLLAPSE_THRESHOLD = 100;
const COLLAPSED_WIDTH = 56;
const SPLITTER_WIDTH = 6;

function ProjectLayoutClientInner({ projectId, children }: ProjectLayoutClientProps) {
  const { projects, activeProject, isLoading } = useProjectContext();

  // Find current project
  const currentProject =
    projects.find((p) => p.project_id === projectId) || activeProject;

  // Get folder navigation state
  // Use property_subtype (most specific) → project_type → project_type_code (fallback)
  const effectivePropertyType = currentProject?.property_subtype
    || currentProject?.project_type
    || currentProject?.project_type_code;

  const {
    currentFolder,
    currentTab,
    setFolderTab,
    folderConfig,
  } = useFolderNavigation({
    propertyType: effectivePropertyType,
    analysisType: currentProject?.analysis_type,
  });

  // Resizable panel state
  const {
    width: landscaperWidth,
    isCollapsed,
    isResizing,
    toggleCollapsed,
    handleResizeStart,
    containerRef,
  } = useResizablePanel({
    defaultWidth: DEFAULT_LANDSCAPER_WIDTH,
    minWidth: MIN_LANDSCAPER_WIDTH,
    maxWidthPercent: MAX_WIDTH_PERCENT,
    collapseThreshold: COLLAPSE_THRESHOLD,
    collapsedWidth: COLLAPSED_WIDTH,
  });

  // Handle folder/tab navigation
  const handleNavigate = (folder: string, tab: string) => {
    setFolderTab(folder, tab);
  };

  // Alpha Assistant flyout state
  const [isAlphaFlyoutOpen, setIsAlphaFlyoutOpen] = useState(false);
  const pageContext = `${currentFolder}/${currentTab}`;

  if (isLoading) {
    return (
      <div className="studio-layout-container">
        <div className="studio-project-bar-placeholder" />
        <div className="studio-split-container">
          <div className="studio-loading-panel" style={{ width: DEFAULT_LANDSCAPER_WIDTH }}>
            <p style={{ color: 'var(--cui-secondary-color)' }}>Loading...</p>
          </div>
          <div className="studio-loading-content">
            <p>Loading project...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="studio-layout-container"
      style={{
        display: 'flex',
        flexDirection: 'row',
        flex: 1,
        minHeight: 0,
        width: '100%',
        padding: '0.5rem',
        gap: 0,
      }}
    >
      {/* Left Panel - Landscaper (resizable or collapsed) - full height */}
      <div
        className="studio-landscaper-panel"
        style={{
          width: landscaperWidth,
          minWidth: isCollapsed ? COLLAPSED_WIDTH : MIN_LANDSCAPER_WIDTH,
          maxWidth: isCollapsed ? COLLAPSED_WIDTH : `${MAX_WIDTH_PERCENT}%`,
          flexShrink: 0,
          height: 'calc(100vh - 80px)',
          transition: isResizing ? 'none' : 'width 0.2s ease',
        }}
      >
        {isCollapsed ? (
          <CollapsedLandscaperStrip onExpand={toggleCollapsed} />
        ) : (
          <LandscaperPanel projectId={projectId} activeTab={currentFolder} />
        )}
      </div>

      {/* Resizable Splitter - always visible when not collapsed */}
      {!isCollapsed && (
        <div
          className="studio-resizable-splitter"
          onPointerDown={handleResizeStart}
          style={{
            width: '12px',
            cursor: 'col-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
            flexShrink: 0,
          }}
        >
          <div
            className="studio-splitter-handle"
            style={{
              width: '2px',
              height: '48px',
              borderRadius: '1px',
              backgroundColor: 'var(--cui-border-color)',
            }}
          />
        </div>
      )}

      {/* Right Column - Project Bar + Folder Tabs + Content */}
      <div
        className="studio-right-column"
        data-folder={currentFolder}
        style={{
          flex: '1 1 0%',
          minWidth: '400px',
          display: 'flex',
          flexDirection: 'column',
          marginLeft: isCollapsed ? '0.5rem' : '0',
          transition: isResizing ? 'none' : 'margin-left 0.2s ease',
          gap: '0.25rem',
        }}
      >
        {/* Project Bar - above folder tabs */}
        <StudioProjectBar
          projectId={projectId}
          isLandscaperCollapsed={isCollapsed}
          onToggleLandscaper={toggleCollapsed}
          onAlphaAssistantClick={() => setIsAlphaFlyoutOpen(true)}
        />

        {/* Content Card - Folder Tabs + Content */}
        <CCard
          className="studio-content-card shadow-lg"
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            // Use white background for sales tab to avoid grey card bg
            ...(currentTab === 'sales' && { backgroundColor: 'var(--surface-bg)' }),
          }}
        >
          {/* Folder Tabs Navigation */}
          <FolderTabs
            folders={folderConfig.folders}
            currentFolder={currentFolder}
            currentTab={currentTab}
            onNavigate={handleNavigate}
          />

          {/* Content Area */}
          <div className="studio-folder-content" data-subtab={currentTab}>
            {children}
          </div>
        </CCard>
      </div>

      {/* Alpha Assistant Flyout */}
      <AlphaAssistantFlyout
        isOpen={isAlphaFlyoutOpen}
        onClose={() => setIsAlphaFlyoutOpen(false)}
        pageContext={pageContext}
        projectId={projectId}
      />
    </div>
  );
}

export function ProjectLayoutClient({ projectId, children }: ProjectLayoutClientProps) {
  return (
    <Suspense
      fallback={
        <div
          className="studio-layout-container"
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            padding: '0.25rem 0.5rem 0.5rem 0.25rem',
          }}
        >
          <div
            style={{
              height: '52px',
              marginBottom: '0.5rem',
              backgroundColor: 'var(--cui-tertiary-bg)',
              borderRadius: 'var(--cui-card-border-radius)',
            }}
          />
          <div
            style={{
              display: 'flex',
              flex: 1,
              minHeight: 0,
              gap: '0.5rem',
            }}
          >
            <div
              style={{
                width: DEFAULT_LANDSCAPER_WIDTH,
                flexShrink: 0,
                backgroundColor: 'var(--cui-card-bg)',
                borderRadius: 'var(--cui-card-border-radius)',
              }}
            />
            <div
              style={{
                flex: 1,
                backgroundColor: 'var(--cui-card-bg)',
                borderRadius: 'var(--cui-card-border-radius)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <p style={{ color: 'var(--cui-secondary-color)' }}>Loading...</p>
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
