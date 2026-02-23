/**
 * ProjectLayoutClient
 *
 * Resizable split-panel layout with ARGUS-style folder tab navigation:
 * - Full-width ActiveProjectBar at top (project selector + type pills)
 * - Left panel: Resizable Landscaper (collapses to icon strip)
 * - Right panel: Folder tabs + content area
 * - Draggable splitter between panels with auto-collapse behavior
 *
 * URL pattern: /projects/[projectId]?folder=valuation&tab=sales
 *
 * @version 4.0
 * @updated 2026-02-08 - ActiveProjectBar at full width, chevron moved to Landscaper panel
 */

'use client';

import React, { Suspense, useState, useCallback, useEffect } from 'react';
import { CCard, CCardHeader, CCardBody, CToast, CToastBody, CToaster } from '@coreui/react';
import { usePendingRentRollExtractions } from '@/hooks/usePendingRentRollExtractions';
import { useExtractionJobStatus } from '@/hooks/useExtractionJobStatus';
// RentRollUpdateReviewModal retired — delta changes now shown inline in the rent roll grid
import { useProjectContext } from '@/app/components/ProjectProvider';
import { LandscaperPanel } from '@/components/landscaper/LandscaperPanel';
import { CollapsedLandscaperStrip } from '@/components/landscaper/CollapsedLandscaperStrip';
import { ActiveProjectBar } from './components/ActiveProjectBar';
// AlphaAssistantFlyout removed — all help/feedback consolidated into global Help panel
import FolderTabs from '@/components/navigation/FolderTabs';
import { useFolderNavigation } from '@/hooks/useFolderNavigation';
import { useResizablePanel } from '@/hooks/useResizablePanel';
import { FileDropProvider, useFileDrop } from '@/contexts/FileDropContext';
import { LandscaperCollisionProvider } from '@/contexts/LandscaperCollisionContext';
import { DropZoneWrapper } from '@/components/ui/DropZoneWrapper';
import { formatFolderLabel } from '@/lib/utils/folderTabConfig';
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
const COLLAPSED_WIDTH = 64;

function ProjectLayoutClientInner({ projectId, children }: ProjectLayoutClientProps) {
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

  const {
    currentFolder,
    currentTab,
    setFolderTab,
    folderConfig,
  } = useFolderNavigation({
    propertyType: effectivePropertyType,
    analysisType: currentProject?.analysis_type,
    analysisPerspective: currentProject?.analysis_perspective,
    analysisPurpose: currentProject?.analysis_purpose,
    valueAddEnabled: currentProject?.value_add_enabled ?? false,
    tileConfig: currentProject?.tile_config,
  });

  // Use the pending rent roll extractions hook
  const {
    pendingCount: rentRollPendingCount,
  } = usePendingRentRollExtractions(projectId);

  // Use extraction job status hook
  const {
    rentRollJob,
    refresh: refreshJobStatus,
  } = useExtractionJobStatus(projectId);

  // Determine badge state based on job status and pending count
  const getRentRollBadgeState = useCallback((): {
    type: 'processing' | 'error' | 'pending' | null;
    count: number | null;
    message?: string;
  } => {
    // Check for active job first
    if (rentRollJob) {
      if (rentRollJob.status === 'processing' || rentRollJob.status === 'queued') {
        return { type: 'processing', count: null };
      }
      if (rentRollJob.status === 'failed') {
        return { type: 'error', count: null, message: rentRollJob.error_message || 'Extraction failed' };
      }
    }

    // Check for pending review
    if (rentRollPendingCount > 0) {
      return { type: 'pending', count: rentRollPendingCount };
    }

    return { type: null, count: null };
  }, [rentRollJob, rentRollPendingCount]);

  const rentRollBadgeState = getRentRollBadgeState();

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

  // File drop notification state
  const [dropToast, setDropToast] = useState<string | null>(null);
  const { pendingFiles } = useFileDrop();

  // Show toast when files are dropped (especially when Landscaper is collapsed)
  useEffect(() => {
    if (pendingFiles.length > 0) {
      const fileNames = pendingFiles.slice(0, 2).map(pf => pf.file.name).join(', ');
      const extra = pendingFiles.length > 2 ? ` (+${pendingFiles.length - 2} more)` : '';
      setDropToast(`Processing: ${fileNames}${extra}`);

      // Auto-expand Landscaper panel if collapsed so the upload can proceed
      if (isCollapsed) {
        toggleCollapsed();
      }
    }
  }, [pendingFiles, isCollapsed, toggleCollapsed]);

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (!dropToast) return;
    const timer = setTimeout(() => setDropToast(null), 5000);
    return () => clearTimeout(timer);
  }, [dropToast]);

  // Handle folder/tab navigation
  const handleNavigate = (folder: string, tab: string) => {
    setFolderTab(folder, tab);
  };

  // Handle rent roll badge click - navigate to rent roll tab (pending changes shown inline in grid)
  const handleRentRollBadgeClick = useCallback((): boolean => {
    // Navigate to the rent roll tab where the grid shows inline highlights
    setFolderTab('property', 'rent-roll');
    return false; // Allow navigation to proceed
  }, [setFolderTab]);

  // Handle sub-tab badge click — navigate to rent roll tab (pending changes shown inline)
  const handleSubTabBadgeClick = useCallback((tabId: string, _badgeCount: number): boolean => {
    if (tabId === 'rent-roll') {
      // If processing or queued, don't do anything
      if (rentRollBadgeState.type === 'processing') {
        return true; // Prevent navigation
      }
      // If error, refresh and try again
      if (rentRollBadgeState.type === 'error') {
        refreshJobStatus();
        return true;
      }
      // Navigate to rent roll tab — grid will show pending change highlights
      handleRentRollBadgeClick();
    }
    return false;
  }, [handleRentRollBadgeClick, rentRollBadgeState, refreshJobStatus]);


  const activeFolderConfig = folderConfig.folders.find((folder) => folder.id === currentFolder);
  const hasSubTabs = (activeFolderConfig?.subTabs.length ?? 0) > 0;
  const activeSubTabConfig = activeFolderConfig?.subTabs.find((tab) => tab.id === currentTab);
  const landscaperContextLabel = activeSubTabConfig?.label || (
    activeFolderConfig ? formatFolderLabel(activeFolderConfig.label) : currentFolder
  );
  const landscaperContextColor = activeFolderConfig?.color || 'var(--cui-tertiary-bg)';

  if (isLoading) {
    return (
      <div className="project-layout-container">
        <div className="project-bar-placeholder" style={{ height: '48px', borderBottom: '1px solid var(--cui-border-color)' }} />
        <div className="project-split-container" style={{ display: 'flex', flex: 1, minHeight: 0, gap: '0.5rem', paddingTop: '0.5rem' }}>
          <div style={{ width: DEFAULT_LANDSCAPER_WIDTH, flexShrink: 0, backgroundColor: 'var(--cui-card-bg)', borderRadius: 'var(--cui-card-border-radius)' }}>
            <p style={{ color: 'var(--cui-secondary-color)', padding: '1rem' }}>Loading...</p>
          </div>
          <div style={{ flex: 1, backgroundColor: 'var(--cui-card-bg)', borderRadius: 'var(--cui-card-border-radius)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p>Loading project...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="project-layout-container">
      {/* Full-width Active Project Bar - sticky below top nav, with nav tiles */}
      <ActiveProjectBar
        projectId={projectId}
        folders={folderConfig.folders}
        currentFolder={currentFolder}
        onFolderNavigate={handleNavigate}
      />

      {/* Two-column split below the project bar */}
      <div
        ref={containerRef}
        className="project-split-container"
        style={{
          display: 'flex',
          flexDirection: 'row',
          flex: 1,
          minHeight: 0,
          width: '100%',
          paddingTop: '0.5rem',
          gap: 0,
        }}
      >
        {/* Left Panel - Landscaper (resizable or collapsed) - full height */}
        <div
          className="project-landscaper-panel"
          style={{
            width: landscaperWidth,
            minWidth: isCollapsed ? COLLAPSED_WIDTH : MIN_LANDSCAPER_WIDTH,
            maxWidth: isCollapsed ? COLLAPSED_WIDTH : `${MAX_WIDTH_PERCENT}%`,
            flexShrink: 0,
            height: 'calc(100vh - 128px)', // 58px top nav + 48px project bar + gap
            transition: isResizing ? 'none' : 'width 0.2s ease',
          }}
        >
          {isCollapsed ? (
            <CollapsedLandscaperStrip onExpand={toggleCollapsed} />
          ) : (
            <LandscaperPanel
              projectId={projectId}
              activeTab={currentFolder}
              pageContext={currentFolder}
              subtabContext={currentTab}
              contextPillLabel={landscaperContextLabel}
              contextPillColor={landscaperContextColor}
              onToggleCollapse={toggleCollapsed}
            />
          )}
        </div>

        {/* Resizable Splitter - always visible when not collapsed */}
        {!isCollapsed && (
          <div
            className="project-resizable-splitter"
            onPointerDown={handleResizeStart}
            style={{
              width: '6px',
              cursor: 'col-resize',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              flexShrink: 0,
            }}
          >
            <div
              className="project-splitter-handle"
              style={{
                width: '2px',
                height: '48px',
                borderRadius: '1px',
                backgroundColor: 'var(--cui-border-color)',
              }}
            />
          </div>
        )}

        {/* Right Column - Folder Tabs + Content */}
        <div
          className="project-right-column"
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
          {/* Folder Tabs + Content — CCard wrapper when subtabs exist */}
          {hasSubTabs ? (
            <CCard
              className="project-content-card"
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <CCardHeader className="project-subtab-header">
                <FolderTabs
                  folders={folderConfig.folders}
                  currentFolder={currentFolder}
                  currentTab={currentTab}
                  onNavigate={handleNavigate}
                  subTabBadgeStates={{ 'rent-roll': rentRollBadgeState }}
                  onSubTabBadgeClick={handleSubTabBadgeClick}
                />
              </CCardHeader>
              <CCardBody style={{ padding: 0, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <DropZoneWrapper className="project-folder-content-wrapper">
                  <div className="project-folder-content" data-subtab={currentTab}>
                    {children}
                  </div>
                </DropZoneWrapper>
              </CCardBody>
            </CCard>
          ) : (
            <div
              className="project-content-card"
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <DropZoneWrapper className="project-folder-content-wrapper">
                <div className="project-folder-content" data-subtab={currentTab}>
                  {children}
                </div>
              </DropZoneWrapper>
            </div>
          )}
        </div>
      </div>

      {/* File drop toast notification */}
      <CToaster placement="top-end" style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 9999 }}>
        {dropToast && (
          <CToast
            autohide={true}
            delay={5000}
            visible={true}
            onClose={() => setDropToast(null)}
            style={{
              backgroundColor: 'var(--cui-primary)',
              color: 'white',
              minWidth: '280px',
            }}
          >
            <CToastBody className="d-flex align-items-center gap-2">
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
              {dropToast}
            </CToastBody>
          </CToast>
        )}
      </CToaster>
    </div>
  );
}

export function ProjectLayoutClient({ projectId, children }: ProjectLayoutClientProps) {
  return (
    <FileDropProvider>
    <LandscaperCollisionProvider>
    <Suspense
      fallback={
        <div
          className="project-layout-container"
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
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
              paddingTop: '0.5rem',
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
    </LandscaperCollisionProvider>
    </FileDropProvider>
  );
}
