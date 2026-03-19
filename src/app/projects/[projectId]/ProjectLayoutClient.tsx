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

import React, { Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CCard, CCardHeader, CCardBody, CToast, CToastBody, CToaster } from '@coreui/react';
import { usePendingRentRollExtractions } from '@/hooks/usePendingRentRollExtractions';
import { useExtractionJobStatus } from '@/hooks/useExtractionJobStatus';
// RentRollUpdateReviewModal retired — delta changes now shown inline in the rent roll grid
import { useProjectContext, type ProjectSummary } from '@/app/components/ProjectProvider';
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
import { useExtractionStagingCount } from '@/hooks/useExtractionStagingCount';
import { useProjectCreation } from '@/hooks/useProjectCreation';
import IngestionWorkbenchPanel from './components/IngestionWorkbenchPanel';
import { WorkbenchProvider, useWorkbench } from '@/contexts/WorkbenchContext';
import IntakeChoiceModal from '@/components/intelligence/IntakeChoiceModal';
import { UnifiedIntakeModal } from '@/components/intake/UnifiedIntakeModal';
import ProjectKnowledgeModal from '@/components/intake/ProjectKnowledgeModal';
import PlatformKnowledgeModal from '@/components/intake/PlatformKnowledgeModal';
import { formatFolderLabel } from '@/lib/utils/folderTabConfig';
import { isIncomeProperty } from '@/components/projects/tiles/tileConfig';
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

  // Find current project from SWR-cached list
  const projectFromCache =
    projects.find((p) => p.project_id === projectId) || (activeProject?.project_id === projectId ? activeProject : null);

  // Fallback: if project isn't in the SWR list (e.g. created_by mismatch, stale cache),
  // fetch it directly so the layout renders correct tabs for its property type.
  const [fallbackProject, setFallbackProject] = useState<ProjectSummary | null>(null);
  const [projectNotFound, setProjectNotFound] = useState(false);
  const fallbackAttempted = useRef(false);

  useEffect(() => {
    // Reset when projectId changes
    setFallbackProject(null);
    setProjectNotFound(false);
    fallbackAttempted.current = false;
  }, [projectId]);

  useEffect(() => {
    if (projectFromCache || isLoading || fallbackAttempted.current) return;
    fallbackAttempted.current = true;

    fetch(`/api/projects/${projectId}`)
      .then(res => {
        if (!res.ok) return Promise.reject(res.status);
        return res.json();
      })
      .then((data: ProjectSummary) => setFallbackProject(data))
      .catch(() => {
        // Project doesn't exist or user doesn't have access — mark as not found
        setProjectNotFound(true);
      });
  }, [projectFromCache, isLoading, projectId]);

  const currentProject = projectFromCache ?? fallbackProject;

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
    propertyType: effectivePropertyType ?? undefined,
    analysisType: currentProject?.analysis_type ?? undefined,
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

  // Extraction staging indicator + floating workbench panel
  const { state: workbenchState, openWorkbench, closeWorkbench, pendingIntakeDocs, clearPendingIntakeDocs } = useWorkbench();
  const [localWorkbenchOpen, setLocalWorkbenchOpen] = useState(false);
  const workbenchOpen = workbenchState.isOpen || localWorkbenchOpen;
  const queryClient = useQueryClient();
  const { pendingCount: stagingPendingCount } = useExtractionStagingCount(projectId);

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

  // Prevent browser close / tab close during active ingestion session
  useEffect(() => {
    if (!workbenchOpen) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers show a generic message; returnValue is required for legacy
      e.returnValue = 'You have an active ingestion session. Changes will be lost.';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [workbenchOpen]);

  // Auto-dismiss "Creating..." banner when user lands on the created project page
  const { jobs: creationJobs, dismissJob } = useProjectCreation();
  useEffect(() => {
    for (const job of creationJobs) {
      if (job.projectId === projectId && job.status === 'complete') {
        dismissJob(job.clientId);
      }
    }
  }, [creationJobs, projectId, dismissJob]);

  // Navigation guard state — when workbench is open, intercept navigation
  const [pendingNavigation, setPendingNavigation] = useState<{ folder: string; tab: string } | null>(null);

  // Unified Intake Modal state
  const [intakeVisible, setIntakeVisible] = useState(false);
  const [intakeFiles, setIntakeFiles] = useState<File[]>([]);
  const [projectKnowledgeDoc, setProjectKnowledgeDoc] = useState<{ docId: number; docName: string; docType: string } | null>(null);
  const [platformKnowledgeDoc, setPlatformKnowledgeDoc] = useState<{ docId: number; docName: string; docType: string } | null>(null);
  const [projectKnowledgeQueue, setProjectKnowledgeQueue] = useState<{ docId: number; docName: string; docType: string }[]>([]);
  const [platformKnowledgeQueue, setPlatformKnowledgeQueue] = useState<{ docId: number; docName: string; docType: string }[]>([]);

  // Handle folder/tab navigation — guarded when workbench is open
  const handleNavigate = (folder: string, tab: string) => {
    if (workbenchOpen) {
      // Show confirmation dialog instead of navigating
      setPendingNavigation({ folder, tab });
      return;
    }
    setFolderTab(folder, tab);
  };

  // Watch FileDropContext's pendingIntakeFiles and open UnifiedIntakeModal
  const { pendingIntakeFiles, consumeIntakeFiles } = useFileDrop();
  useEffect(() => {
    if (pendingIntakeFiles.length > 0) {
      const files = consumeIntakeFiles();
      setIntakeFiles(files);
      setIntakeVisible(true);
    }
  }, [pendingIntakeFiles, consumeIntakeFiles]);

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

  // Intake modals — rendered OUTSIDE guards so they persist through loading/revalidation
  const intakeModals = (
    <>
      <UnifiedIntakeModal
        visible={intakeVisible}
        projectId={projectId}
        projectName={currentProject?.project_name ?? ''}
        initialFiles={intakeFiles}
        onClose={() => {
          setIntakeVisible(false);
          setIntakeFiles([]);
        }}
        onProjectKnowledge={(docs) => {
          setProjectKnowledgeQueue(docs);
          if (docs.length > 0) setProjectKnowledgeDoc(docs[0]);
        }}
        onPlatformKnowledge={(docs) => {
          setPlatformKnowledgeQueue(docs);
          if (docs.length > 0) setPlatformKnowledgeDoc(docs[0]);
        }}
      />
      <ProjectKnowledgeModal
        visible={!!projectKnowledgeDoc}
        projectId={projectId}
        doc={projectKnowledgeDoc}
        onClose={() => setProjectKnowledgeDoc(null)}
        onComplete={() => {
          const remaining = projectKnowledgeQueue.slice(1);
          setProjectKnowledgeQueue(remaining);
          setProjectKnowledgeDoc(remaining.length > 0 ? remaining[0] : null);
        }}
      />
      <PlatformKnowledgeModal
        visible={!!platformKnowledgeDoc}
        projectId={projectId}
        doc={platformKnowledgeDoc}
        onClose={() => setPlatformKnowledgeDoc(null)}
        onComplete={() => {
          const remaining = platformKnowledgeQueue.slice(1);
          setPlatformKnowledgeQueue(remaining);
          setPlatformKnowledgeDoc(remaining.length > 0 ? remaining[0] : null);
        }}
      />
    </>
  );

  // Guard: project doesn't exist or user doesn't have access — redirect to dashboard
  if (projectNotFound) {
    // Clear stale localStorage to prevent re-landing here
    if (typeof window !== 'undefined') {
      const storedId = localStorage.getItem('activeProjectId');
      if (storedId === String(projectId)) {
        localStorage.removeItem('activeProjectId');
        localStorage.removeItem('activeProjectTimestamp');
      }
    }
    return (
      <>
      {intakeModals}
      <div className="project-layout-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '400px', gap: '1rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <h3 style={{ color: 'var(--cui-body-color)', margin: '0 0 8px', fontSize: '18px', fontWeight: 600 }}>
            Project Not Found
          </h3>
          <p style={{ color: 'var(--cui-secondary-color)', fontSize: '14px', margin: '0 0 20px', lineHeight: 1.5 }}>
            Project {projectId} doesn&apos;t exist or you don&apos;t have access to it.
          </p>
          <a
            href="/dashboard"
            style={{
              display: 'inline-block',
              padding: '8px 20px',
              borderRadius: '6px',
              background: 'var(--cui-primary)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Go to Dashboard
          </a>
        </div>
      </div>
      </>
    );
  }

  // Guard: show loading skeleton until project data is resolved.
  // Without this, effectivePropertyType is undefined → getProjectCategory(undefined)
  // defaults to 'land_development' → wrong tabs render for income property types (MF, OFF, etc.).
  if (isLoading || !currentProject) {
    return (
      <>
      {intakeModals}
      <div className="project-layout-container">
        <div className="project-bar-placeholder" style={{ height: '48px', borderBottom: '1px solid var(--cui-border-color)' }} />
        <div className="project-split-container" style={{ display: 'flex', flex: 1, minHeight: 0, gap: 'var(--component-gap)', paddingTop: 'var(--app-padding)' }}>
          <div style={{ width: DEFAULT_LANDSCAPER_WIDTH, flexShrink: 0, backgroundColor: 'var(--cui-card-bg)', borderRadius: 'var(--cui-card-border-radius)' }}>
            <p style={{ color: 'var(--cui-secondary-color)', padding: '1rem' }}>Loading...</p>
          </div>
          <div style={{ flex: 1, backgroundColor: 'var(--cui-card-bg)', borderRadius: 'var(--cui-card-border-radius)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p>Loading project...</p>
          </div>
        </div>
      </div>
      </>
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

      {/* Extraction staging indicator — fixed in top nav bar area */}
      {stagingPendingCount > 0 && (
        <button
          className={`extraction-indicator extraction-indicator--pending${workbenchOpen ? ' extraction-indicator--active' : ''}`}
          onClick={() => {
            if (workbenchState.isOpen) {
              closeWorkbench();
            } else {
              setLocalWorkbenchOpen(prev => !prev);
            }
          }}
          style={{
            position: 'fixed',
            top: 14,
            right: 340,
            zIndex: 51,
          }}
          title={`${stagingPendingCount} fields pending review`}
        >
          <span className="ei-badge">{stagingPendingCount}</span>
          fields pending review
        </button>
      )}

      {/* Floating Workbench Panel */}
      {workbenchOpen && (
        <IngestionWorkbenchPanel
          projectId={projectId}
          project={currentProject as { project_id: number; project_name: string }}
          folders={folderConfig.folders}
          isLandDev={!isIncomeProperty(effectivePropertyType ?? undefined)}
          docId={workbenchState.docId}
          intakeUuid={workbenchState.intakeUuid}
          docName={workbenchState.docName}
          docType={workbenchState.docType}
          onClose={async () => {
            // Close the UI immediately so it feels responsive
            closeWorkbench();
            setLocalWorkbenchOpen(false);

            // Full cleanup: hard-delete staging rows + doc text + core_doc,
            // delete UploadThing cloud file, mark intake session abandoned
            if (workbenchState.docId || workbenchState.intakeUuid) {
              const djangoApi = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

              // 1. Hard-delete staging rows, doc text, core_doc record + mark session abandoned
              //    MUST await so the DB is clean before we refetch badge counts
              try {
                await fetch(`${djangoApi}/api/knowledge/projects/${projectId}/extraction-staging/abandon/`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    doc_id: workbenchState.docId,
                    intake_uuid: workbenchState.intakeUuid,
                  }),
                });
              } catch (err) {
                console.warn('[Workbench] abandon failed:', err);
              }

              // 2. Delete backing file from UploadThing cloud storage (fire-and-forget OK)
              if (workbenchState.docId) {
                fetch(`/api/dms/documents/${workbenchState.docId}/delete`, {
                  method: 'DELETE',
                }).catch((err) => console.warn('[Workbench] UT delete failed:', err));
              }

              // 3. Now that DB rows are deleted, refetch badge counts to clear the pill
              queryClient.invalidateQueries({ queryKey: ['extraction-staging', projectId] });
            }
          }}
          onDone={() => {
            // Successful commit — just close the modal, no abandon/cleanup.
            // The document and staging rows are already committed to production.
            closeWorkbench();
            setLocalWorkbenchOpen(false);
            // Refresh DMS + staging queries so the committed doc appears
            queryClient.invalidateQueries({ queryKey: ['extraction-staging', projectId] });
            queryClient.invalidateQueries({ queryKey: ['dms', projectId] });
            queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
          }}
        />
      )}

      {/* IntakeChoiceModal — mounted at layout level so it's accessible from any tab */}
      <IntakeChoiceModal
        visible={pendingIntakeDocs.length > 0}
        projectId={projectId}
        docs={pendingIntakeDocs}
        onClose={clearPendingIntakeDocs}
      />

      {intakeModals}

      {/* Navigation guard dialog — shown when user tries to navigate while workbench is open */}
      {pendingNavigation && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1060,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(2px)',
          }}
        >
          <div
            style={{
              background: 'var(--cui-body-bg, #1e1e2e)',
              border: '1px solid var(--cui-border-color)',
              borderRadius: '10px',
              padding: '28px 32px',
              maxWidth: '400px',
              textAlign: 'center',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            }}
          >
            <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--cui-body-color)', margin: '0 0 8px' }}>
              Active ingestion session
            </p>
            <p style={{ fontSize: '13px', color: 'var(--cui-secondary-color)', margin: '0 0 20px', lineHeight: 1.4 }}>
              You have an active ingestion session. Navigating away will cancel it and discard all pending extractions.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => setPendingNavigation(null)}
                style={{
                  padding: '8px 18px',
                  border: '1px solid var(--cui-border-color)',
                  borderRadius: '6px',
                  background: 'transparent',
                  color: 'var(--cui-body-color)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Stay
              </button>
              <button
                onClick={async () => {
                  const nav = pendingNavigation;
                  setPendingNavigation(null);
                  // Close workbench (triggers abandon + cleanup)
                  closeWorkbench();
                  setLocalWorkbenchOpen(false);
                  // Run abandon in background, then navigate
                  if (workbenchState.docId || workbenchState.intakeUuid) {
                    const djangoApi = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
                    try {
                      await fetch(`${djangoApi}/api/knowledge/projects/${projectId}/extraction-staging/abandon/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          doc_id: workbenchState.docId,
                          intake_uuid: workbenchState.intakeUuid,
                        }),
                      });
                    } catch { /* best-effort */ }
                    if (workbenchState.docId) {
                      fetch(`/api/dms/documents/${workbenchState.docId}/delete`, { method: 'DELETE' }).catch(() => {});
                    }
                    queryClient.invalidateQueries({ queryKey: ['extraction-staging', projectId] });
                  }
                  setFolderTab(nav.folder, nav.tab);
                }}
                style={{
                  padding: '8px 18px',
                  border: 'none',
                  borderRadius: '6px',
                  background: 'var(--cui-danger)',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Leave &amp; Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
          paddingTop: 'var(--app-padding)',
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
            marginLeft: isCollapsed ? 'var(--app-padding)' : '0',
            transition: isResizing ? 'none' : 'margin-left 0.2s ease',
            gap: 'var(--component-gap)',
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
                <div className="project-folder-content" data-subtab={currentTab} style={{ paddingTop: 0 }}>
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
    <WorkbenchProvider>
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
              gap: 'var(--component-gap)',
              paddingTop: 'var(--app-padding)',
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
    </WorkbenchProvider>
    </FileDropProvider>
  );
}
