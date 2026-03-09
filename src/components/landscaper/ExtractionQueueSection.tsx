'use client';

import React, { useState } from 'react';
import { CAlert, CButton, CBadge, CSpinner } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilTrash, cilReload, cilChevronBottom, cilChevronTop, cilWarning } from '@coreui/icons';
import { useExtractionQueue, type ExtractQueueItem } from '@/hooks/useExtractionQueue';
import { useWorkbench } from '@/contexts/WorkbenchContext';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

interface ExtractionQueueSectionProps {
  projectId: number;
}

function statusBadgeColor(status: string): string {
  switch (status) {
    case 'pending': return 'warning';
    case 'processing': return 'info';
    case 'failed': return 'danger';
    case 'completed': return 'success';
    default: return 'secondary';
  }
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function ExtractionQueueSection({ projectId }: ExtractionQueueSectionProps) {
  const {
    items,
    total,
    pendingCount,
    failedCount,
    isLoading,
    deleteAll,
    deleteItems,
    retryItems,
    refresh,
  } = useExtractionQueue(projectId);
  const { openWorkbench } = useWorkbench();
  const [expanded, setExpanded] = useState(false);
  const [acting, setActing] = useState(false);

  /** Open the Ingestion Workbench for a pending/processing queue item */
  const handleOpenWorkbench = async (item: ExtractQueueItem) => {
    if (acting) return;
    setActing(true);
    try {
      // Create (or resume) an intake session so the Workbench has an intakeUuid
      const res = await fetch(`${DJANGO_API_URL}/api/intake/start/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          doc_id: item.doc_id,
          intent: 'structured_ingestion',
          document_type: item.doc_type,
        }),
      });
      const data = await res.json();

      if (res.status === 201 && data.intakeUuid) {
        openWorkbench({
          docId: item.doc_id,
          docName: item.doc_name,
          docType: item.doc_type,
          intakeUuid: data.intakeUuid,
        });

        // Fire-and-forget extraction trigger
        fetch(`${DJANGO_API_URL}/api/knowledge/documents/${item.doc_id}/extract-batched/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_id: projectId }),
        }).catch(err =>
          console.warn('[ExtractionQueue] Extraction trigger failed:', err)
        );
      } else {
        console.error('[ExtractionQueue] Failed to start intake:', data);
      }
    } catch (err) {
      console.error('[ExtractionQueue] Error opening workbench:', err);
    } finally {
      setActing(false);
    }
  };

  // Don't render if no items
  if (!isLoading && total === 0) return null;

  const actionableCount = pendingCount + failedCount;

  const handleDeleteAll = async () => {
    setActing(true);
    await deleteAll();
    setActing(false);
  };

  const handleRetryAll = async () => {
    const failedIds = items.filter(i => i.status === 'failed').map(i => i.queue_id);
    if (failedIds.length === 0) return;
    setActing(true);
    await retryItems(failedIds);
    setActing(false);
  };

  const handleDeleteItem = async (queueId: number) => {
    setActing(true);
    await deleteItems([queueId]);
    setActing(false);
  };

  const handleRetryItem = async (queueId: number) => {
    setActing(true);
    await retryItems([queueId]);
    setActing(false);
  };

  return (
    <div className="mb-2">
      {/* Header bar */}
      <div
        className="d-flex align-items-center justify-content-between px-3 py-2"
        style={{
          backgroundColor: 'var(--cui-tertiary-bg)',
          borderRadius: expanded ? '6px 6px 0 0' : '6px',
          cursor: 'pointer',
          border: '1px solid var(--cui-border-color)',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="d-flex align-items-center gap-2">
          <CIcon icon={cilWarning} size="sm" className="text-warning" />
          <span className="small fw-semibold">
            Extraction Queue
          </span>
          {actionableCount > 0 && (
            <CBadge
              color="warning"
              shape="rounded-pill"
              className="ms-1"
              style={{ cursor: 'pointer' }}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                const firstPending = items.find(i => i.status === 'pending' || i.status === 'processing');
                if (firstPending) handleOpenWorkbench(firstPending);
              }}
              title="Open Ingestion Workbench"
            >
              {actionableCount}
            </CBadge>
          )}
        </div>
        <CIcon icon={expanded ? cilChevronTop : cilChevronBottom} size="sm" />
      </div>

      {/* Expanded list */}
      {expanded && (
        <div
          style={{
            border: '1px solid var(--cui-border-color)',
            borderTop: 'none',
            borderRadius: '0 0 6px 6px',
            backgroundColor: 'var(--cui-body-bg)',
            maxHeight: '280px',
            overflowY: 'auto',
          }}
        >
          {isLoading ? (
            <div className="d-flex justify-content-center py-3">
              <CSpinner size="sm" />
            </div>
          ) : (
            <>
              {/* Bulk actions */}
              {actionableCount > 0 && (
                <div className="d-flex gap-2 px-3 py-2" style={{ borderBottom: '1px solid var(--cui-border-color)' }}>
                  {failedCount > 0 && (
                    <CButton
                      color="warning"
                      variant="ghost"
                      size="sm"
                      disabled={acting}
                      onClick={(e) => { e.stopPropagation(); handleRetryAll(); }}
                    >
                      <CIcon icon={cilReload} size="sm" className="me-1" />
                      Retry {failedCount} Failed
                    </CButton>
                  )}
                  <CButton
                    color="danger"
                    variant="ghost"
                    size="sm"
                    disabled={acting}
                    onClick={(e) => { e.stopPropagation(); handleDeleteAll(); }}
                  >
                    <CIcon icon={cilTrash} size="sm" className="me-1" />
                    Clear All
                  </CButton>
                  {acting && <CSpinner size="sm" className="ms-2" />}
                </div>
              )}

              {/* Item list */}
              {items.map((item: ExtractQueueItem) => {
                const isClickable = item.status === 'pending' || item.status === 'processing';
                return (
                <div
                  key={item.queue_id}
                  className="d-flex align-items-center justify-content-between px-3 py-2"
                  style={{
                    borderBottom: '1px solid var(--cui-border-color-translucent)',
                    cursor: isClickable ? 'pointer' : 'default',
                  }}
                  onClick={isClickable ? () => handleOpenWorkbench(item) : undefined}
                  title={isClickable ? 'Click to open Ingestion Workbench' : undefined}
                >
                  <div className="d-flex flex-column" style={{ minWidth: 0, flex: 1 }}>
                    <div className="d-flex align-items-center gap-2">
                      <span
                        className="small text-truncate"
                        style={{ maxWidth: '160px' }}
                        title={item.doc_name}
                      >
                        {item.doc_name}
                      </span>
                      <CBadge color={statusBadgeColor(item.status)} size="sm">
                        {item.status}
                      </CBadge>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <span className="text-body-secondary" style={{ fontSize: '0.7rem' }}>
                        {item.extract_type}
                      </span>
                      <span className="text-body-secondary" style={{ fontSize: '0.7rem' }}>
                        {formatTimestamp(item.created_at)}
                      </span>
                      {item.attempts > 0 && (
                        <span className="text-body-secondary" style={{ fontSize: '0.7rem' }}>
                          {item.attempts}/{item.max_attempts} attempts
                        </span>
                      )}
                    </div>
                    {item.error_message && (
                      <span className="text-danger" style={{ fontSize: '0.65rem' }}>
                        {item.error_message.length > 80
                          ? item.error_message.slice(0, 80) + '...'
                          : item.error_message}
                      </span>
                    )}
                  </div>
                  <div className="d-flex gap-1 ms-2 flex-shrink-0">
                    {item.status === 'failed' && (
                      <CButton
                        color="warning"
                        variant="ghost"
                        size="sm"
                        className="p-1"
                        title="Retry"
                        disabled={acting}
                        onClick={() => handleRetryItem(item.queue_id)}
                      >
                        <CIcon icon={cilReload} size="sm" />
                      </CButton>
                    )}
                    {(item.status === 'pending' || item.status === 'failed') && (
                      <CButton
                        color="danger"
                        variant="ghost"
                        size="sm"
                        className="p-1"
                        title="Delete"
                        disabled={acting}
                        onClick={() => handleDeleteItem(item.queue_id)}
                      >
                        <CIcon icon={cilTrash} size="sm" />
                      </CButton>
                    )}
                  </div>
                </div>
                );
              })}

              {items.length === 0 && (
                <div className="text-center text-body-secondary small py-3">
                  No items in queue
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default ExtractionQueueSection;
