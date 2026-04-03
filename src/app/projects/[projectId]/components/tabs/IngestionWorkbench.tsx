'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  useExtractionStaging,
  type StagingRow,
  type StagingSection,
} from '@/hooks/useExtractionStaging';
import { LandscaperChatThreaded, type LandscaperChatHandle } from '@/components/landscaper/LandscaperChatThreaded';
import RentRollMapper from '@/components/ingestion/RentRollMapper';
import { useWorkbench } from '@/contexts/WorkbenchContext';
import type { FolderTab } from '@/lib/utils/folderTabConfig';
import '@/styles/ingestion-workbench.css';

interface Project {
  project_id: number;
  project_name: string;
  [key: string]: unknown;
}

interface IngestionWorkbenchProps {
  projectId: number;
  project?: Project;
  /** Live folder config from useFolderNavigation — drives section grouping */
  folders: FolderTab[];
  /** True for land development projects (changes scope→folder mapping) */
  isLandDev?: boolean;
  /** Source document ID — scopes field table to this document's extractions */
  docId?: number | null;
  /** Intake session UUID — scopes the Landscaper chat thread */
  intakeUuid?: string | null;
  /** Name of the file being ingested (shown in header) */
  docName?: string | null;
  /** Detected document type */
  docType?: string | null;
  onClose?: () => void;
  /** Called instead of onClose after a successful commit — skips the abandon flow */
  onDone?: () => void;
  /** Called when user chooses "Finish Later" — closes UI but preserves all progress */
  onPause?: () => void;
}

// ─────────────────────────────────────────────────
// Utility: format extracted value for display
// ─────────────────────────────────────────────────

/** Priority keys to show when summarizing a JSON object (order matters) */
const SUMMARY_KEYS = [
  'unit_type', 'name', 'label', 'type', 'description',
  'unit_count', 'count', 'quantity',
  'bedrooms', 'bathrooms', 'beds', 'baths',
  'avg_sf', 'sqft', 'square_feet', 'area',
  'avg_rent', 'rent', 'market_rent', 'monthly_rent',
];

function formatObjectValue(obj: Record<string, unknown>): string {
  // Pick the most informative fields for a human-readable summary
  const parts: string[] = [];
  for (const key of SUMMARY_KEYS) {
    if (key in obj && obj[key] !== null && obj[key] !== undefined && obj[key] !== '') {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      parts.push(`${label}: ${obj[key]}`);
    }
    if (parts.length >= 4) break; // Cap at 4 fields for readability
  }
  // If no priority keys matched, show first 3 key-value pairs
  if (parts.length === 0) {
    const entries = Object.entries(obj).filter(([, v]) => v !== null && v !== undefined);
    for (const [k, v] of entries.slice(0, 3)) {
      const label = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      parts.push(`${label}: ${v}`);
    }
  }
  return parts.join(' · ') || JSON.stringify(obj);
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object' && val !== null) {
    // If it's an array, format each element
    if (Array.isArray(val)) {
      return val.map(item =>
        typeof item === 'object' && item !== null
          ? formatObjectValue(item as Record<string, unknown>)
          : String(item)
      ).join('; ');
    }
    // It's a plain object — format as readable summary
    return formatObjectValue(val as Record<string, unknown>);
  }
  const str = String(val);
  // If string looks like JSON, try to parse and format it
  if (str.startsWith('{') || str.startsWith('[')) {
    try {
      const parsed = JSON.parse(str);
      if (typeof parsed === 'object' && parsed !== null) {
        return Array.isArray(parsed)
          ? parsed.map(item =>
              typeof item === 'object' && item !== null
                ? formatObjectValue(item as Record<string, unknown>)
                : String(item)
            ).join('; ')
          : formatObjectValue(parsed as Record<string, unknown>);
      }
    } catch {
      // Not valid JSON — fall through to string handling
    }
  }
  // Strip trailing .00 from whole-dollar numeric values (e.g., "1590.00" → "1590")
  if (/^\d+\.00$/.test(str)) return str.replace(/\.00$/, '');
  return str;
}

// ─────────────────────────────────────────────────
// Determine UI status for a row (handles conflict detection)
// ─────────────────────────────────────────────────
type UIStatus = 'accepted' | 'pending' | 'conflict' | 'waiting' | 'empty';

function getUIStatus(row: StagingRow): UIStatus {
  if (row.status === 'rejected') return 'empty';
  if (row._uiStatus === 'conflict') return 'conflict';
  if (row.status === 'accepted' || row.status === 'applied') return 'accepted';
  if (row.status === 'pending') return 'pending';
  return 'pending';
}

// ─────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────

function FieldRow({
  row,
  allRowsForKey,
  onApprove,
  onReject,
  onResolveConflict,
  onEditValue,
}: {
  row: StagingRow;
  allRowsForKey: StagingRow[];
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onResolveConflict: (acceptId: number, rejectId: number) => void;
  onEditValue?: (id: number, newValue: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const uiStatus = getUIStatus(row);
  const isUnmapped = row._folderId === '_other';

  const dotClass = {
    accepted: 'fd-ok',
    pending: 'fd-warn',
    conflict: 'fd-danger',
    waiting: 'fd-info',
    empty: 'fd-muted',
  }[uiStatus]; // Use raw uiStatus for dot — phantom conflicts recalculated below

  const conflictRows = allRowsForKey.filter(
    (r) =>
      r.status === 'pending' &&
      r._uiStatus === 'conflict'
  );

  // A conflict with no competing values is a phantom — treat as editable pending
  const isPhantomConflict = uiStatus === 'conflict' && conflictRows.length === 0 && !row.conflict_existing;
  const effectiveStatus = isPhantomConflict ? 'pending' : uiStatus;

  const handleStartEdit = useCallback(() => {
    // Allow editing for pending, accepted, phantom-conflict, and empty fields
    if (effectiveStatus === 'conflict' || effectiveStatus === 'waiting') return;
    setEditVal(formatValue(row.extracted_value));
    setEditing(true);
  }, [row.extracted_value, effectiveStatus]);

  const handleCommitEdit = useCallback(() => {
    setEditing(false);
    const trimmed = editVal.trim();
    if (trimmed !== formatValue(row.extracted_value) && onEditValue) {
      onEditValue(row.extraction_id, trimmed);
    }
  }, [editVal, row.extracted_value, row.extraction_id, onEditValue]);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleCommitEdit();
      } else if (e.key === 'Escape') {
        setEditing(false);
      }
    },
    [handleCommitEdit],
  );

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  return (
    <>
      <div className={`wb-field-row${effectiveStatus === 'conflict' ? ' conflict-row' : ''}${isUnmapped ? ' unmapped-row' : ''}`}>
        <div className="fd-name">
          <span className={`fd-dot ${isPhantomConflict ? 'fd-warn' : dotClass}`} />
          {row.field_label}
          {isUnmapped && (
            <span
              className="fd-unmapped-badge"
              title={`Unmapped scope: "${row.scope}"`}
              style={{
                marginLeft: 6,
                fontSize: 9,
                padding: '1px 4px',
                borderRadius: 3,
                background: 'var(--cui-warning)',
                color: '#000',
                fontWeight: 600,
              }}
            >
              ?
            </span>
          )}
        </div>
        <div
          className={`fd-value${
            effectiveStatus === 'conflict'
              ? ' conflict-val'
              : effectiveStatus === 'waiting'
                ? ' waiting-val'
                : effectiveStatus === 'empty'
                  ? ' empty-val'
                  : ' editable'
          }`}
          onDoubleClick={handleStartEdit}
          title={effectiveStatus !== 'conflict' && effectiveStatus !== 'waiting' ? 'Double-click to edit' : undefined}
        >
          {editing ? (
            <input
              ref={inputRef}
              className="fd-edit-input"
              value={editVal}
              onChange={(e) => setEditVal(e.target.value)}
              onBlur={handleCommitEdit}
              onKeyDown={handleEditKeyDown}
            />
          ) : effectiveStatus === 'conflict' ? (
            `\u26A0 Conflict \u2014 ${conflictRows.length} values`
          ) : effectiveStatus === 'waiting' ? (
            'Awaiting extraction\u2026'
          ) : effectiveStatus === 'empty' ? (
            <span className="empty-val-text">Double-click to enter value</span>
          ) : (
            formatValue(row.extracted_value) || <span className="empty-val-text">Double-click to enter value</span>
          )}
        </div>
        <div className="fd-source">{row.source_label || '\u2014'}</div>
        <div className="fd-actions">
          {(effectiveStatus === 'pending' || effectiveStatus === 'empty') && (
            <>
              <button
                className="btn-action accept"
                title="Accept"
                onClick={() => onApprove(row.extraction_id)}
              >
                ✓
              </button>
              <button
                className="btn-action"
                title="Reject"
                onClick={() => onReject(row.extraction_id)}
              >
                ✕
              </button>
            </>
          )}
          {effectiveStatus === 'conflict' && (
            <button
              className="btn-action expand"
              title="Resolve conflict"
              onClick={() => setExpanded(!expanded)}
            >
              ↕
            </button>
          )}
        </div>
      </div>
      {effectiveStatus === 'conflict' && expanded && (
        <div className="wb-conf-expand">
          {/* Show existing DB value if available (the value that triggered the conflict) */}
          {row.conflict_existing && (
            <div className="conf-option conf-existing" title="Currently accepted value in the database">
              <div className="conf-source">
                <span className="conf-existing-badge">Current</span>
                {row.conflict_existing.existing_source || 'Existing data'}
              </div>
              <div className="conf-value">{formatValue(row.conflict_existing.existing_value)}</div>
              <div className="conf-confidence">
                {row.conflict_existing.existing_confidence !== null
                  ? `${Math.round(row.conflict_existing.existing_confidence * 100)}% confidence`
                  : 'Previously accepted'}
              </div>
            </div>
          )}
          {conflictRows.map((cr) => (
            <div
              key={cr.extraction_id}
              className="conf-option"
              onClick={() => {
                const otherId = conflictRows.find(
                  (r) => r.extraction_id !== cr.extraction_id
                )?.extraction_id;
                if (otherId) {
                  onResolveConflict(cr.extraction_id, otherId);
                  setExpanded(false);
                }
              }}
            >
              <div className="conf-source">
                <span className="conf-new-badge">New</span>
                {cr.source_label || 'Unknown source'}
              </div>
              <div className="conf-value">{formatValue(cr.extracted_value)}</div>
              <div className="conf-confidence">
                {cr.confidence_score !== null
                  ? `${Math.round(cr.confidence_score * 100)}% confidence`
                  : 'No confidence score'}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function SectionBlock({
  section,
  onApprove,
  onReject,
  onResolveConflict,
  onCommitSection,
  onEditValue,
}: {
  section: StagingSection;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onResolveConflict: (acceptId: number, rejectId: number) => void;
  onCommitSection: (scopes: string[]) => void;
  onEditValue?: (id: number, newValue: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  // Deduplicate: for conflict groups, show only the first row
  const displayRows = useMemo(() => {
    const seen = new Set<string>();
    return section.rows.filter((row) => {
      const uiStatus = getUIStatus(row);
      if (uiStatus === 'conflict') {
        if (seen.has(row.field_key)) return false;
        seen.add(row.field_key);
      }
      return true;
    });
  }, [section.rows]);

  // Build lookup: field_key → all rows (for conflict resolution)
  const rowsByKey = useMemo(() => {
    const map = new Map<string, StagingRow[]>();
    for (const row of section.rows) {
      if (!map.has(row.field_key)) map.set(row.field_key, []);
      map.get(row.field_key)!.push(row);
    }
    return map;
  }, [section.rows]);

  const { accepted, pending, conflict } = section.statusCounts;
  const acceptedCount = section.rows.filter(
    (r) => r.status === 'accepted' || r.status === 'applied'
  ).length;

  return (
    <div className="wb-section">
      <div className="wb-sec-header" onClick={() => setCollapsed(!collapsed)}>
        <span className="sec-label">{section.label}</span>
        {section.authority && (
          <span className="sec-authority">
            <span
              className="auth-dot"
              style={{ background: section.authority.color }}
            />
            {section.authority.source}
          </span>
        )}
        <div className="sec-pills">
          {accepted > 0 && (
            <span className="sec-pill has-count">{accepted} accepted</span>
          )}
          {pending > 0 && (
            <span className="sec-pill has-count">{pending} pending</span>
          )}
          {conflict > 0 && (
            <span className="sec-pill has-count">{conflict} conflict</span>
          )}
        </div>
        {acceptedCount > 0 && (
          <button
            className="btn-discuss"
            onClick={(e) => {
              e.stopPropagation();
              onCommitSection(section.scopes);
            }}
          >
            Commit {section.label}
          </button>
        )}
        <span className={`sec-chevron${collapsed ? ' collapsed' : ''}`}>▼</span>
      </div>

      <div className={`wb-sec-body${collapsed ? ' collapsed' : ''}`}>
        {displayRows.map((row) => (
          <FieldRow
            key={row.extraction_id}
            row={row}
            allRowsForKey={rowsByKey.get(row.field_key) || []}
            onApprove={onApprove}
            onReject={onReject}
            onResolveConflict={onResolveConflict}
            onEditValue={onEditValue}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────

export default function IngestionWorkbench({
  projectId,
  project,
  folders,
  isLandDev = false,
  docId,
  intakeUuid,
  docName,
  docType,
  onClose,
  onDone,
  onPause,
}: IngestionWorkbenchProps) {
  const {
    sections,
    allRows,
    sectionCounts,
    isExtracting,
    isLoading,
    error,
    approveField,
    rejectField,
    acceptAllPending,
    commitSection,
    commitAllAccepted,
    isCommitting,
    isCommitSuccess,
    commitError,
    commitResult,
    updateFieldValue,
    abandonSession,
  } = useExtractionStaging(projectId, folders, isLandDev, docId);

  const chatRef = useRef<LandscaperChatHandle>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [conflictsOnly, setConflictsOnly] = useState(false);
  const briefingSent = useRef(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [rentRollCommitted, setRentRollCommitted] = useState(false);

  // Notify WorkbenchContext when commit succeeds so other components can refresh
  const { notifyCommitSuccess } = useWorkbench();
  useEffect(() => {
    if (isCommitSuccess || rentRollCommitted) {
      notifyCommitSuccess();
    }
  }, [isCommitSuccess, rentRollCommitted, notifyCommitSuccess]);

  // Auto-close the workbench after a successful commit (standard or rent roll).
  // Brief delay lets the user see the success state before the modal disappears.
  useEffect(() => {
    if ((isCommitSuccess || rentRollCommitted) && (onDone || onClose)) {
      const timer = setTimeout(() => {
        (onDone || onClose)?.();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isCommitSuccess, rentRollCommitted, onDone, onClose]);

  // Show chat panel when we have an intake session
  const showChat = !!intakeUuid;

  // Detect rent roll document for mapper section
  const isRentRoll = Boolean(
    docType && /rent.?roll/i.test(docType)
  );

  // Build tile tabs dynamically from sections that have data
  const tileTabs = useMemo(() => {
    const tabs: { id: string; label: string }[] = [{ id: 'all', label: 'All' }];
    for (const sec of sections) {
      tabs.push({ id: sec.id, label: sec.label });
    }
    return tabs;
  }, [sections]);

  // Reset activeTab to 'all' if current tab's section disappeared
  const effectiveTab = useMemo(() => {
    if (activeTab === 'all') return 'all';
    if (sections.some(s => s.id === activeTab)) return activeTab;
    return 'all';
  }, [activeTab, sections]);

  // Filter sections based on active tile tab
  const filteredSections = useMemo(() => {
    let result = sections;
    if (effectiveTab !== 'all') {
      result = result.filter((s) => s.id === effectiveTab);
    }
    if (conflictsOnly) {
      result = result
        .map((s) => ({
          ...s,
          rows: s.rows.filter(
            (r) => r._uiStatus === 'conflict'
          ),
        }))
        .filter((s) => s.rows.length > 0);
    }
    return result;
  }, [sections, effectiveTab, conflictsOnly]);

  // Count conflicts across all sections
  const totalConflicts = sections.reduce(
    (sum, s) => sum + s.statusCounts.conflict,
    0
  );

  const totalAccepted = allRows.filter(
    (r) => r.status === 'accepted'
  ).length;

  const handleResolveConflict = useCallback(
    (acceptId: number, rejectId: number) => {
      approveField(acceptId);
      rejectField(rejectId);
    },
    [approveField, rejectField],
  );

  const handleEditValue = useCallback(
    (extractionId: number, newValue: string) => {
      if (updateFieldValue) {
        updateFieldValue({ extractionId, newValue });
      }
    },
    [updateFieldValue],
  );

  // Pending floor plan replacement data (from commit response)
  const [pendingFloorPlan, setPendingFloorPlan] = useState<{
    staging_ids: number[];
    message: string;
  } | null>(null);

  const DJANGO_API = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

  // Wrap commitAllAccepted to handle floor_plan_prompt in response
  const handleCommitAll = useCallback(async () => {
    try {
      const result = await commitAllAccepted();
      if (result?.floor_plan_prompt) {
        const fp = result.floor_plan_prompt;
        // Send Landscaper message for user to decide
        if (showChat && chatRef.current) {
          chatRef.current.sendMessage(fp.message, { hidden: true });
        }
        // Store staging IDs for the confirm/reject flow
        setPendingFloorPlan({
          staging_ids: fp.staging_ids,
          message: fp.message,
        });
      }
    } catch {
      // Error is handled by the mutation's onError
    }
  }, [commitAllAccepted, showChat]);

  // Apply floor plan replacement after user confirms
  const handleApplyFloorPlan = useCallback(async () => {
    if (!pendingFloorPlan) return;
    try {
      const res = await fetch(
        `${DJANGO_API}/api/knowledge/projects/${projectId}/extraction-staging/apply-floor-plan/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ staging_ids: pendingFloorPlan.staging_ids }),
        }
      );
      if (res.ok) {
        if (showChat && chatRef.current) {
          chatRef.current.sendMessage(
            'Floor plan matrix has been replaced with the rent roll data.',
            { hidden: true }
          );
        }
      }
    } catch (err) {
      console.error('[Workbench] apply-floor-plan error:', err);
    }
    setPendingFloorPlan(null);
  }, [pendingFloorPlan, projectId, showChat, DJANGO_API]);

  const handleDismissFloorPlan = useCallback(() => {
    setPendingFloorPlan(null);
  }, []);

  // Send opening briefing prompt once extraction data has arrived.
  // Instead of building a stale client-side summary, we ask the Landscaper
  // to call get_ingestion_staging and provide a live briefing from the DB.
  // We wait for isExtracting to become false (rows arrived) before sending.
  useEffect(() => {
    if (briefingSent.current || isLoading || !showChat || !docId) return;
    if (isExtracting) return; // still extracting — no rows yet
    if (allRows.length === 0) return; // edge case: extraction finished but empty

    briefingSent.current = true;

    // Send a user-style prompt that instructs Landscaper to call its tool
    const prompt = [
      `I just uploaded "${docName || 'a document'}"${docType ? ` (${docType})` : ''} for structured ingestion.`,
      `Please use your get_ingestion_staging tool with doc_id=${docId} to review the extracted fields,`,
      `then give me a brief summary: how many fields were extracted, which categories they fall into,`,
      `and whether any have conflicts or low confidence that need my attention.`,
    ].join(' ');

    chatRef.current?.sendMessage(prompt, { hidden: true });
  }, [isLoading, showChat, isExtracting, allRows.length, docId, docName, docType]);

  if (isLoading) {
    return (
      <div className="wb-shell">
        <div
          className="text-center py-20"
          style={{ color: 'var(--cui-secondary-color)' }}
        >
          <div
            className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 mb-4"
            style={{ borderColor: 'var(--cui-primary)' }}
          />
          <p>Loading extraction staging data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wb-shell">
        <div
          className="text-center py-20"
          style={{ color: 'var(--cui-danger)' }}
        >
          <p>Failed to load extraction data.</p>
          <p style={{ fontSize: 12, color: 'var(--cui-secondary-color)' }}>
            {String(error)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="wb-shell">
      {/* ── Header ─────────────────────────── */}
      <div className="wb-header">
        <span className="hdr-title">Ingestion Workbench</span>
        {docName && (
          <span className="hdr-badge">{docName}</span>
        )}
        {docType && (
          <span className="hdr-badge new">{docType}</span>
        )}
        {!docName && project && (
          <span className="hdr-badge">{project.project_name}</span>
        )}
        <span className="hdr-spacer" />
        {isExtracting ? (
          /* Phase 1: Extraction in-flight — show analyzing indicator */
          <span className="hdr-extraction-status extracting">
            <span className="extraction-spinner" />
            Analyzing document…
          </span>
        ) : (
          /* Phase 2: Fields have arrived — show field count + review progress */
          <>
            <span className="hdr-extraction-status ready">
              <span className="extraction-check">✓</span>
              {allRows.length} field{allRows.length !== 1 ? 's' : ''} extracted
            </span>
            <span className="hdr-review-progress">
              {totalAccepted} / {allRows.length} reviewed
            </span>
          </>
        )}
        <button
          className="btn-commit-all"
          onClick={handleCommitAll}
          disabled={totalAccepted === 0 || isCommitting || isCommitSuccess || rentRollCommitted}
          style={(isCommitSuccess || rentRollCommitted) ? { background: 'var(--cui-success)', opacity: 1 } : undefined}
        >
          {isCommitting
            ? 'Committing...'
            : (isCommitSuccess || rentRollCommitted)
              ? '✓ Committed — closing...'
              : `Commit All Accepted \u2192 Project`}
        </button>
        {(onClose || onDone) && (
          (isCommitSuccess || rentRollCommitted) ? (
            <button
              className="btn-cancel-ingestion"
              style={{ borderColor: 'var(--cui-success)', color: 'var(--cui-success)' }}
              onClick={() => (onDone || onClose)?.()}
            >
              Done
            </button>
          ) : (
            <button
              className="btn-cancel-ingestion"
              onClick={() => setShowCancelConfirm(true)}
              disabled={isCancelling}
            >
              {isCancelling ? 'Cancelling...' : 'Cancel Ingestion'}
            </button>
          )
        )}
      </div>

      {/* ── Cancel confirmation overlay ── */}
      {showCancelConfirm && (
        <div className="wb-cancel-overlay">
          <div className="wb-cancel-dialog">
            <p className="wb-cancel-title">Close ingestion session?</p>
            <p className="wb-cancel-desc">
              You can save your progress and finish later, or discard everything.
            </p>
            <div className="wb-cancel-actions">
              <button
                className="wb-cancel-back"
                onClick={() => setShowCancelConfirm(false)}
                disabled={isCancelling}
              >
                Go Back
              </button>
              <button
                className="wb-cancel-pause"
                disabled={isCancelling}
                onClick={() => {
                  onPause?.();
                  setShowCancelConfirm(false);
                }}
              >
                Finish Later
              </button>
              <button
                className="wb-cancel-confirm"
                disabled={isCancelling}
                onClick={async () => {
                  setIsCancelling(true);
                  try {
                    onClose?.();
                  } catch {
                    // onClose is fire-and-forget in ProjectLayoutClient
                  }
                  setShowCancelConfirm(false);
                  setIsCancelling(false);
                }}
              >
                {isCancelling ? 'Discarding...' : 'Discard & Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Body: Chat (left) + Field Table (right) ── */}
      <div className="wb-body">
        {/* Left: Landscaper Chat */}
        {showChat && (
          <div className="wb-left">
            <LandscaperChatThreaded
              ref={chatRef}
              projectId={projectId}
              pageContext="ingestion"
              subtabContext={intakeUuid || undefined}
              contextPillLabel="Ingestion"
              contextPillColor="var(--cui-info)"
              isExpanded={true}
            />
          </div>
        )}

        {/* Right: Field review table */}
        <div className="wb-right">
          {/* Tile tabs — derived from sections that have data */}
          <div className="wb-tile-tabs">
            {tileTabs.map((tab) => (
              <button
                key={tab.id}
                className={`tile-tab${effectiveTab === tab.id ? ' active' : ''}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  setConflictsOnly(false);
                }}
              >
                {tab.label}
                {tab.id !== 'all' && sectionCounts[tab.id] ? (
                  <span className="tab-count">{sectionCounts[tab.id]}</span>
                ) : tab.id === 'all' ? (
                  <span className="tab-count">{allRows.length}</span>
                ) : null}
              </button>
            ))}
            <span className="tab-spacer" />
            {totalConflicts > 0 && (
              <button
                className={`tile-tab conflict-toggle${conflictsOnly ? ' active' : ''}`}
                onClick={() => setConflictsOnly(!conflictsOnly)}
              >
                Conflicts ({totalConflicts})
              </button>
            )}
          </div>

          {/* Column headers */}
          <div className="wb-col-headers">
            <span>Field</span>
            <span>Value</span>
            <span>Source</span>
            <span style={{ textAlign: 'right' }}>Status</span>
          </div>

          {/* Field scroll */}
          <div className="wb-field-scroll">
            {/* Rent Roll Mapper — appears above standard field rows in Property tile */}
            {docId && isRentRoll && (effectiveTab === 'all' || effectiveTab === 'property') && (
              <RentRollMapper
                projectId={projectId}
                docId={docId}
                onCommitComplete={() => {
                  setRentRollCommitted(true);
                }}
              />
            )}
            {filteredSections.map((section) => (
              <SectionBlock
                key={section.id}
                section={section}
                onApprove={approveField}
                onReject={rejectField}
                onResolveConflict={handleResolveConflict}
                onCommitSection={commitSection}
                onEditValue={handleEditValue}
              />
            ))}
            {filteredSections.length === 0 && !isRentRoll && (
              <div className="wb-empty-state">
                {isExtracting ? (
                  <>
                    <div className="wb-empty-spinner" />
                    <p className="wb-empty-title">
                      Analyzing {docName || 'document'}…
                    </p>
                    <p className="wb-empty-desc">
                      Extracting fields from your document. Results will appear here automatically.
                    </p>
                  </>
                ) : conflictsOnly ? (
                  <p className="wb-empty-desc">No conflicts to resolve.</p>
                ) : (
                  <>
                    <p className="wb-empty-title">Extraction returned no fields</p>
                    <p className="wb-empty-desc">
                      The extraction pipeline could not extract structured data from this document.
                      This may happen with scanned PDFs, image-only files, or macro-heavy spreadsheets.
                      Try asking Landscaper to ingest this document, or upload a different format.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Commit error banner */}
          {commitError && (
            <div style={{
              padding: '6px 16px',
              fontSize: 12,
              background: 'var(--cui-danger)',
              color: '#fff',
              flexShrink: 0,
            }}>
              Commit error: {String(commitError instanceof Error ? commitError.message : commitError)}
            </div>
          )}

          {/* Partial commit failure banner — fields that failed to flatten */}
          {commitResult && commitResult.failed > 0 && (
            <div style={{
              padding: '8px 16px',
              fontSize: 12,
              background: 'var(--cui-warning-bg, #fff3cd)',
              borderTop: '1px solid var(--cui-warning, #ffc107)',
              color: 'var(--cui-body-color)',
              flexShrink: 0,
            }}>
              <strong>{commitResult.committed} field(s) committed, {commitResult.failed} failed to write:</strong>
              <ul style={{ margin: '4px 0 0 16px', padding: 0, listStyle: 'disc' }}>
                {commitResult.errors.slice(0, 5).map((e, i) => (
                  <li key={i}><code>{e.field_key}</code>: {e.error}</li>
                ))}
                {commitResult.errors.length > 5 && (
                  <li>…and {commitResult.errors.length - 5} more</li>
                )}
              </ul>
            </div>
          )}

          {/* Floor plan replacement prompt */}
          {pendingFloorPlan && (
            <div style={{
              padding: '8px 16px',
              fontSize: 12,
              background: 'var(--cui-warning-bg, #fff3cd)',
              borderTop: '1px solid var(--cui-warning, #ffc107)',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <span style={{ flex: 1, color: 'var(--cui-body-color)' }}>
                ⚠ Floor plan matrix conflict detected. Check Landscaper chat for details.
              </span>
              <button
                className="btn-bulk primary"
                style={{ fontSize: 11, padding: '3px 10px' }}
                onClick={handleApplyFloorPlan}
              >
                Replace Floor Plan
              </button>
              <button
                className="btn-bulk"
                style={{ fontSize: 11, padding: '3px 10px' }}
                onClick={handleDismissFloorPlan}
              >
                Keep Existing
              </button>
            </div>
          )}

          {/* Bottom bar */}
          <div className="wb-bottom">
            <div className="legend">
              <span className="legend-item">
                <span className="legend-dot fd-ok" /> Accepted
              </span>
              <span className="legend-item">
                <span className="legend-dot fd-warn" /> Pending
              </span>
              <span className="legend-item">
                <span className="legend-dot fd-danger" /> Conflict
              </span>
              <span className="legend-item">
                <span className="legend-dot fd-info" /> Waiting
              </span>
              <span className="legend-item">
                <span className="legend-dot fd-muted" /> Empty
              </span>
            </div>
            <div className="bulk-actions">
              <button
                className="btn-bulk"
                onClick={() => acceptAllPending(undefined)}
                disabled={isCommitting}
              >
                Accept All Pending
              </button>
              <button
                className="btn-bulk primary"
                onClick={handleCommitAll}
                disabled={totalAccepted === 0 || isCommitting}
              >
                {isCommitting ? 'Committing...' : 'Commit All \u2192'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
