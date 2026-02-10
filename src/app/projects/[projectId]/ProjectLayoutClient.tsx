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
import { CCard, CToast, CToastBody, CToaster } from '@coreui/react';
import { usePendingRentRollExtractions } from '@/hooks/usePendingRentRollExtractions';
import { useExtractionJobStatus } from '@/hooks/useExtractionJobStatus';
import {
  RentRollUpdateReviewModal,
  RentRollComparisonResponse,
  RentRollExtractionMap,
} from '@/components/landscaper/RentRollUpdateReviewModal';
import { useProjectContext } from '@/app/components/ProjectProvider';
import { LandscaperPanel } from '@/components/landscaper/LandscaperPanel';
import { CollapsedLandscaperStrip } from '@/components/landscaper/CollapsedLandscaperStrip';
import { ActiveProjectBar } from './components/ActiveProjectBar';
import { AlphaAssistantFlyout } from '@/components/alpha';
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

  // Use the pending rent roll extractions hook
  const {
    pendingCount: rentRollPendingCount,
    documentId: pendingDocumentId,
    refresh: refreshPendingExtractions,
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

  // Rent roll review modal state
  const [showRentRollReviewModal, setShowRentRollReviewModal] = useState(false);
  const [rentRollComparisonData, setRentRollComparisonData] = useState<RentRollComparisonResponse | null>(null);
  const [rentRollExtractedUnits, setRentRollExtractedUnits] = useState<RentRollExtractionMap>({});

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

  // Handle rent roll badge click - fetch comparison data and open modal
  const handleRentRollBadgeClick = useCallback(async (): Promise<boolean> => {
    if (rentRollPendingCount === 0 || !pendingDocumentId) {
      return false; // Allow normal navigation
    }

    try {
      // Fetch comparison data from the Django backend
      const backendUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/knowledge/projects/${projectId}/rent-roll/compare/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: pendingDocumentId }),
      });

      if (!response.ok) {
        console.error('Failed to fetch rent roll comparison:', response.status);
        return false; // Allow normal navigation on error
      }

      const data = await response.json();

      // Build extraction map from deltas
      const extractedUnits: RentRollExtractionMap = {};
      if (data.deltas) {
        data.deltas.forEach((delta: { extraction_id: number; unit_number: string | number | null; changes: Array<{ field: string; extracted_value: unknown }> }) => {
          const unitData: Record<string, unknown> = { unit_number: delta.unit_number };
          delta.changes.forEach((change) => {
            unitData[change.field] = change.extracted_value;
          });
          extractedUnits[delta.extraction_id] = unitData;
        });
      }

      setRentRollComparisonData(data);
      setRentRollExtractedUnits(extractedUnits);
      setShowRentRollReviewModal(true);
      return true; // Prevent normal navigation
    } catch (err) {
      console.error('Error fetching rent roll comparison:', err);
      return false; // Allow normal navigation on error
    }
  }, [projectId, rentRollPendingCount, pendingDocumentId]);

  // Handle sub-tab badge click
  const handleSubTabBadgeClick = useCallback((tabId: string, badgeCount: number): boolean => {
    if (tabId === 'rent-roll') {
      // If processing or queued, don't do anything
      if (rentRollBadgeState.type === 'processing') {
        return true; // Prevent navigation but don't open modal
      }
      // If error, refresh and try again
      if (rentRollBadgeState.type === 'error') {
        refreshJobStatus();
        return true;
      }
      // If pending with count, open the modal
      if (badgeCount > 0 || rentRollBadgeState.type === 'pending') {
        handleRentRollBadgeClick();
        return true;
      }
    }
    return false;
  }, [handleRentRollBadgeClick, rentRollBadgeState, refreshJobStatus]);

  // Handle commit success - refresh pending count and close modal
  const handleRentRollCommitSuccess = useCallback((snapshotId?: number) => {
    console.log('Rent roll commit successful, snapshot ID:', snapshotId);
    refreshPendingExtractions();
    setShowRentRollReviewModal(false);
    setRentRollComparisonData(null);
    setRentRollExtractedUnits({});
  }, [refreshPendingExtractions]);

  // Handle modal close (without commit) - just close, keep pending
  const handleRentRollModalClose = useCallback(() => {
    setShowRentRollReviewModal(false);
    setRentRollComparisonData(null);
    setRentRollExtractedUnits({});
  }, []);

  // Alpha Assistant flyout state
  const [isAlphaFlyoutOpen, setIsAlphaFlyoutOpen] = useState(false);
  const pageContext = `${currentFolder}/${currentTab}`;
  const activeFolderConfig = folderConfig.folders.find((folder) => folder.id === currentFolder);
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
      {/* Full-width Active Project Bar - sticky below top nav */}
      <ActiveProjectBar
        projectId={projectId}
        onAlphaAssistantClick={() => setIsAlphaFlyoutOpen(true)}
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
          {/* Content Card - Folder Tabs + Content */}
          <CCard
            className="project-content-card shadow-lg"
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
              subTabBadgeStates={{ 'rent-roll': rentRollBadgeState }}
              onSubTabBadgeClick={handleSubTabBadgeClick}
            />

            {/* Content Area - with drop zone for file uploads */}
            <DropZoneWrapper className="project-folder-content-wrapper">
              <div className="project-folder-content" data-subtab={currentTab}>
                {children}
              </div>
            </DropZoneWrapper>
          </CCard>
        </div>
      </div>

      {/* Alpha Assistant Flyout */}
      <AlphaAssistantFlyout
        isOpen={isAlphaFlyoutOpen}
        onClose={() => setIsAlphaFlyoutOpen(false)}
        pageContext={pageContext}
        projectId={projectId}
      />

      {/* Rent Roll Review Modal */}
      {rentRollComparisonData && (
        <RentRollUpdateReviewModal
          visible={showRentRollReviewModal}
          onClose={handleRentRollModalClose}
          projectId={projectId}
          comparisonData={rentRollComparisonData}
          extractedUnitsById={rentRollExtractedUnits}
          onCommitSuccess={handleRentRollCommitSuccess}
          onRefresh={refreshPendingExtractions}
        />
      )}

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
