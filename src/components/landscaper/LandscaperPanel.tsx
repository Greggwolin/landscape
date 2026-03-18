'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CCard, CAlert, CButton, CSpinner } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilCheckCircle, cilWarning, cilX } from '@coreui/icons';
import { useQueryClient } from '@tanstack/react-query';
import { LandscaperChatThreaded, type LandscaperChatHandle } from './LandscaperChatThreaded';
import { ActivityFeed } from './ActivityFeed';
import { ExtractionReviewModal } from './ExtractionReviewModal';
import { useExtractionJobStatus } from '@/hooks/useExtractionJobStatus';
import { usePendingRentRollExtractions } from '@/hooks/usePendingRentRollExtractions';
import { ExtractionQueueSection } from './ExtractionQueueSection';
// RentRollUpdateReviewModal retired — delta changes now shown inline in the rent roll grid
import FieldMappingInterface from './FieldMappingInterface';
import MediaPreviewModal from '@/components/dms/modals/MediaPreviewModal';

interface LandscaperPanelProps {
  projectId: number;
  activeTab?: string;
  pageContext?: string;
  subtabContext?: string;
  contextPillLabel?: string;
  contextPillColor?: string;
  onToggleCollapse?: () => void;
}

interface ExtractionResult {
  doc_id: number;
  doc_name: string;
  field_mappings: Array<{
    extraction_id?: number;
    source_text: string;
    suggested_field: string;
    suggested_value: string;
    confidence: number;
    scope?: string;
    scope_label?: string;
    status?: 'pending' | 'conflict';
    conflict_existing_value?: string;
    conflict_existing_doc_name?: string;
    conflict_existing_confidence?: number;
  }>;
  summary?: {
    total: number;
    pending: number;
    conflict: number;
    validated: number;
    applied: number;
  };
}

export function LandscaperPanel({
  projectId,
  activeTab = 'home',
  pageContext,
  subtabContext,
  contextPillLabel,
  contextPillColor,
  onToggleCollapse,
}: LandscaperPanelProps) {
  // Internal state management with localStorage persistence
  const queryClient = useQueryClient();
  const [isActivityExpanded, setActivityExpanded] = useState(false);
  const [expandedSplitRatio, setExpandedSplitRatio] = useState(0.25);
  const [collapsedSplitRatio, setCollapsedSplitRatio] = useState(0.75);
  const [splitRatio, setSplitRatio] = useState(0.25);
  const [splitContainerHeight, setSplitContainerHeight] = useState(0);
  const [isResizing, setIsResizing] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement | null>(null);
  const chatRef = useRef<LandscaperChatHandle>(null);
  const splitRatioRef = useRef(splitRatio);
  const expandedSplitRef = useRef(expandedSplitRatio);
  const collapsedSplitRef = useRef(collapsedSplitRatio);
  const [showExtractionModal, setShowExtractionModal] = useState(false);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [, setPendingFile] = useState<File | null>(null);
  // Field mapping interface state (for Excel/CSV rent rolls)
  const [showFieldMappingModal, setShowFieldMappingModal] = useState(false);
  const [fieldMappingDocId, setFieldMappingDocId] = useState<number | null>(null);
  const [fieldMappingDocName, setFieldMappingDocName] = useState<string>('');

  // Media preview modal state
  const [showMediaPreview, setShowMediaPreview] = useState(false);
  const [mediaPreviewDocId, setMediaPreviewDocId] = useState<number | null>(null);
  const [mediaPreviewDocName, setMediaPreviewDocName] = useState<string>('');

  // Extraction job status
  const { rentRollJob, cancelJob: cancelExtractionJob } = useExtractionJobStatus(projectId);
  const { pendingCount: rentRollPendingCount, documentId: pendingDocumentId, refresh: refreshPendingExtractions } = usePendingRentRollExtractions(projectId);
  const [extractionBannerDismissed, setExtractionBannerDismissed] = useState(false);

  const RESIZER_SIZE = 6;
  const MIN_CHAT_HEIGHT = 180;
  const MIN_ACTIVITY_HEIGHT = 160;

  // Restore state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('landscape-activity-expanded');
    const savedExpanded = localStorage.getItem('landscape-landscaper-split-expanded');
    const savedCollapsed = localStorage.getItem('landscape-landscaper-split-collapsed');
    const nextIsExpanded = saved === null ? false : saved === 'true';
    const parsedExpanded = Number.parseFloat(savedExpanded ?? '');
    const parsedCollapsed = Number.parseFloat(savedCollapsed ?? '');
    const nextExpandedRatio = Number.isFinite(parsedExpanded) && parsedExpanded > 0 && parsedExpanded < 1
      ? parsedExpanded
      : 0.25;
    const nextCollapsedRatio = Number.isFinite(parsedCollapsed) && parsedCollapsed > 0 && parsedCollapsed < 1
      ? parsedCollapsed
      : 0.75;

    setActivityExpanded(nextIsExpanded);
    setExpandedSplitRatio(nextExpandedRatio);
    setCollapsedSplitRatio(nextCollapsedRatio);
    setSplitRatio(nextIsExpanded ? nextExpandedRatio : nextCollapsedRatio);
  }, []);

  useEffect(() => {
    splitRatioRef.current = splitRatio;
  }, [splitRatio]);

  useEffect(() => {
    expandedSplitRef.current = expandedSplitRatio;
  }, [expandedSplitRatio]);

  useEffect(() => {
    collapsedSplitRef.current = collapsedSplitRatio;
  }, [collapsedSplitRatio]);

  const handleActivityToggle = () => {
    const newValue = !isActivityExpanded;
    setActivityExpanded(newValue);
    localStorage.setItem('landscape-activity-expanded', String(newValue));
    setSplitRatio(newValue ? expandedSplitRatio : collapsedSplitRatio);
  };

  // Handle field mapping completion
  const handleFieldMappingComplete = useCallback(
    async (result: { jobId: number; unitsExtracted: number }) => {
      setShowFieldMappingModal(false);
      setFieldMappingDocId(null);
      setFieldMappingDocName('');

      // Reset banner dismissed state so it shows for this new extraction
      setExtractionBannerDismissed(false);

      // Refresh pending extractions to pick up any staged data
      refreshPendingExtractions();

      // The extraction banner and pending count will appear automatically via the pending extractions hook
    },
    [refreshPendingExtractions, pendingDocumentId]
  );

  // Media preview modal handler (triggered from Landscaper chat MediaSummaryCard)
  const handleReviewMedia = useCallback((docId: number, docName: string) => {
    setMediaPreviewDocId(docId);
    setMediaPreviewDocName(docName);
    setShowMediaPreview(true);
  }, []);

  // Use react-dropzone for more reliable drag and drop
  // Supports multiple files for OM packages (rent roll + T-12 + OM together)




  useEffect(() => {
    const container = splitContainerRef.current;
    if (!container) return;

    const updateHeight = () => {
      setSplitContainerHeight(container.clientHeight);
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  const clampSplitRatio = useCallback((ratio: number, containerHeight: number) => {
    const availableHeight = Math.max(containerHeight - RESIZER_SIZE, 1);
    const minRatio = Math.min(0.9, MIN_CHAT_HEIGHT / availableHeight);
    const maxRatio = Math.max(0.1, 1 - MIN_ACTIVITY_HEIGHT / availableHeight);
    if (minRatio > maxRatio) {
      return 0.5;
    }
    return Math.min(Math.max(ratio, minRatio), maxRatio);
  }, []);

  const getRatioFromClientY = useCallback((clientY: number) => {
    const container = splitContainerRef.current;
    if (!container) return splitRatioRef.current;
    const rect = container.getBoundingClientRect();
    const availableHeight = Math.max(container.clientHeight - RESIZER_SIZE, 1);
    const offset = clientY - rect.top;
    return offset / availableHeight;
  }, []);

  const updateSplitRatio = useCallback((ratio: number) => {
    const clampedRatio = clampSplitRatio(ratio, splitContainerHeight);
    setSplitRatio(clampedRatio);
    if (isActivityExpanded) {
      setExpandedSplitRatio(clampedRatio);
    } else {
      setCollapsedSplitRatio(clampedRatio);
    }
  }, [clampSplitRatio, isActivityExpanded, splitContainerHeight]);

  const handleResizerPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    updateSplitRatio(getRatioFromClientY(event.clientY));
    setIsResizing(true);
  }, [getRatioFromClientY, updateSplitRatio]);

  useEffect(() => {
    if (!isResizing) return;

    const handlePointerMove = (event: PointerEvent) => {
      updateSplitRatio(getRatioFromClientY(event.clientY));
    };

    const handlePointerUp = () => {
      setIsResizing(false);
      localStorage.setItem('landscape-landscaper-split-expanded', String(expandedSplitRef.current));
      localStorage.setItem('landscape-landscaper-split-collapsed', String(collapsedSplitRef.current));
    };

    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isResizing, updateSplitRatio]);

  useEffect(() => {
    if (!splitContainerHeight) return;
    const nextRatio = clampSplitRatio(splitRatioRef.current, splitContainerHeight);
    if (nextRatio !== splitRatioRef.current) {
      updateSplitRatio(nextRatio);
    }
  }, [clampSplitRatio, splitContainerHeight, updateSplitRatio]);

  const availableHeight = Math.max(splitContainerHeight - RESIZER_SIZE, 0);
  const chatHeight = Math.round(availableHeight * splitRatio);
  const activityHeight = Math.max(availableHeight - chatHeight, 0);
  const hasMeasuredHeight = splitContainerHeight > 0;

  return (
    <div
      className="flex flex-col h-full gap-1 relative"
      style={{
        borderRadius: 'var(--cui-card-border-radius)',
        transition: 'border-color 0.15s ease, background-color 0.15s ease'
      }}
    >
      <div
        ref={splitContainerRef}
        className="flex flex-col flex-1 min-h-0"
        style={{ cursor: isResizing ? 'row-resize' : 'default' }}
      >
        {/* Landscaper Chat Card */}
        <CCard
          className="flex flex-col min-h-0 shadow-lg overflow-hidden"
          style={{
            flex: '1 1 0',
            minHeight: MIN_CHAT_HEIGHT,
          }}
        >
          <LandscaperChatThreaded
            ref={chatRef}
            projectId={projectId}
            pageContext={pageContext || activeTab}
            subtabContext={subtabContext}
            contextPillLabel={contextPillLabel}
            contextPillColor={contextPillColor}
            isIngesting={false}
            ingestionProgress={0}
            ingestionMessage=""
            isExpanded={!isActivityExpanded}
            onToggleExpand={handleActivityToggle}
            onCollapsePanel={onToggleCollapse}
            onReviewMedia={handleReviewMedia}
          />
        </CCard>

        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize Landscaper panel"
          className="flex items-center justify-center"
          style={{
            height: `${RESIZER_SIZE}px`,
            cursor: 'row-resize',
            backgroundColor: 'transparent',
          }}
          onPointerDown={handleResizerPointerDown}
        >
          <div
            style={{
              width: '60px',
              height: '2px',
              borderRadius: '999px',
              backgroundColor: 'var(--cui-border-color)',
              opacity: 0.7,
            }}
          />
        </div>

        {/* Extraction Job Status Indicator */}
        {rentRollJob && (rentRollJob.status === 'processing' || rentRollJob.status === 'queued') && (
          <CAlert color="info" className="mb-2 d-flex align-items-center justify-content-between py-2">
            <div className="d-flex align-items-center gap-2">
              <CSpinner size="sm" />
              <span className="small">
                Processing {rentRollJob.document_name || 'rent roll'}...
                {rentRollJob.progress.total && rentRollJob.progress.total > 0 && (
                  <span className="text-body-secondary ms-1">
                    ({rentRollJob.progress.processed}/{rentRollJob.progress.total})
                  </span>
                )}
              </span>
            </div>
            <CButton
              color="link"
              size="sm"
              className="p-0 text-body-secondary"
              onClick={() => cancelExtractionJob(rentRollJob.id)}
              title="Cancel extraction"
            >
              <CIcon icon={cilX} size="sm" />
            </CButton>
          </CAlert>
        )}

        {rentRollJob?.status === 'failed' && (
          <CAlert color="danger" className="mb-2 py-2">
            <div className="d-flex align-items-center gap-2">
              <CIcon icon={cilWarning} size="sm" />
              <span className="small">
                Extraction failed: {rentRollJob.error_message || 'Unknown error'}
              </span>
            </div>
          </CAlert>
        )}

        {rentRollJob?.status === 'completed' && rentRollPendingCount > 0 && !extractionBannerDismissed && (
          <CAlert
            color="success"
            className="mb-2 d-flex align-items-center justify-content-between py-2"
            dismissible
            onClose={() => setExtractionBannerDismissed(true)}
          >
            <div className="d-flex align-items-center gap-2">
              <CIcon icon={cilCheckCircle} size="sm" />
              <span className="small">
                Extraction complete! {rentRollPendingCount} changes highlighted in the rent roll grid.
              </span>
            </div>
            <CButton
              color="primary"
              size="sm"
              onClick={() => {
                // Navigate to rent roll tab where inline delta review is shown
                const url = new URL(window.location.href);
                url.searchParams.set('folder', 'property');
                url.searchParams.set('tab', 'rent-roll');
                window.history.pushState({}, '', url.toString());
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="me-2"
            >
              View in Grid
            </CButton>
          </CAlert>
        )}

        {/* Extraction Queue (pending/failed items from dms_extract_queue) */}
        <ExtractionQueueSection projectId={projectId} />

        {/* Activity Feed Card — collapsed: header only; expanded: grows to fit content */}
        <CCard
          className="shadow-lg overflow-hidden"
          style={{
            flex: isActivityExpanded ? '0 0 auto' : '0 0 auto',
            maxHeight: isActivityExpanded ? '50%' : undefined,
            overflow: isActivityExpanded ? 'auto' : 'hidden',
          }}
        >
          <ActivityFeed
            projectId={projectId}
            isExpanded={isActivityExpanded}
            onToggle={handleActivityToggle}
          />
        </CCard>
      </div>

      {/* Extraction Review Modal */}
      {showExtractionModal && extractionResult && (
        <ExtractionReviewModal
          isOpen={showExtractionModal}
          onClose={() => {
            setShowExtractionModal(false);
            setExtractionResult(null);
            setPendingFile(null);
          }}
          projectId={projectId}
          docId={extractionResult.doc_id}
          docName={extractionResult.doc_name}
          fieldMappings={extractionResult.field_mappings}
          summary={extractionResult.summary}
          onCommit={() => {
            setShowExtractionModal(false);
            setExtractionResult(null);
            setPendingFile(null);
          }}
        />
      )}

      {/* Field Mapping Interface for structured rent rolls (Excel/CSV) */}
      {showFieldMappingModal && fieldMappingDocId && (
        <FieldMappingInterface
          projectId={projectId}
          documentId={fieldMappingDocId}
          documentName={fieldMappingDocName}
          visible={showFieldMappingModal}
          onClose={() => {
            setShowFieldMappingModal(false);
            setFieldMappingDocId(null);
            setFieldMappingDocName('');
          }}
          onComplete={handleFieldMappingComplete}
        />
      )}

      {/* Media Preview Modal — triggered from Landscaper chat MediaSummaryCard */}
      {showMediaPreview && mediaPreviewDocId && (
        <MediaPreviewModal
          isOpen={showMediaPreview}
          onClose={() => {
            setShowMediaPreview(false);
            setMediaPreviewDocId(null);
            setMediaPreviewDocName('');
          }}
          docId={mediaPreviewDocId}
          docName={mediaPreviewDocName}
          projectId={projectId}
          onComplete={() => {
            setShowMediaPreview(false);
            setMediaPreviewDocId(null);
            setMediaPreviewDocName('');
          }}
        />
      )}
    </div>
  );
}
