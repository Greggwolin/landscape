'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  useExtractionStaging,
  type StagingRow,
  type StagingSection,
} from '@/hooks/useExtractionStaging';
import { LandscaperChatThreaded, type LandscaperChatHandle } from '@/components/landscaper/LandscaperChatThreaded';
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
}

// ─────────────────────────────────────────────────
// Utility: format extracted value for display
// ─────────────────────────────────────────────────
function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
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
  }[uiStatus];

  const conflictRows = allRowsForKey.filter(
    (r) =>
      r.status === 'pending' &&
      r._uiStatus === 'conflict'
  );

  const handleStartEdit = useCallback(() => {
    if (uiStatus === 'conflict' || uiStatus === 'waiting' || uiStatus === 'empty') return;
    setEditVal(formatValue(row.extracted_value));
    setEditing(true);
  }, [row.extracted_value, uiStatus]);

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
      <div className={`wb-field-row${uiStatus === 'conflict' ? ' conflict-row' : ''}${isUnmapped ? ' unmapped-row' : ''}`}>
        <div className="fd-name">
          <span className={`fd-dot ${dotClass}`} />
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
            uiStatus === 'conflict'
              ? ' conflict-val'
              : uiStatus === 'waiting'
                ? ' waiting-val'
                : uiStatus === 'empty'
                  ? ' empty-val'
                  : ' editable'
          }`}
          onDoubleClick={handleStartEdit}
          title={uiStatus !== 'conflict' && uiStatus !== 'waiting' && uiStatus !== 'empty' ? 'Double-click to edit' : undefined}
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
          ) : uiStatus === 'conflict' ? (
            `\u26A0 Conflict \u2014 ${conflictRows.length} values`
          ) : uiStatus === 'waiting' ? (
            'Awaiting extraction\u2026'
          ) : uiStatus === 'empty' ? (
            'Not found in documents'
          ) : (
            formatValue(row.extracted_value)
          )}
        </div>
        <div className="fd-source">{row.source_label || '\u2014'}</div>
        <div className="fd-actions">
          {uiStatus === 'pending' && (
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
          {uiStatus === 'conflict' && (
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
      {uiStatus === 'conflict' && expanded && (
        <div className="wb-conf-expand">
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
              <div className="conf-source">{cr.source_label || 'Unknown source'}</div>
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
}: IngestionWorkbenchProps) {
  const {
    sections,
    allRows,
    sectionCounts,
    modelReadyPct,
    isLoading,
    error,
    approveField,
    rejectField,
    acceptAllPending,
    commitSection,
    commitAllAccepted,
    isCommitting,
    commitError,
    updateFieldValue,
    abandonSession,
  } = useExtractionStaging(projectId, folders, isLandDev, docId);

  const chatRef = useRef<LandscaperChatHandle>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [conflictsOnly, setConflictsOnly] = useState(false);
  const briefingSent = useRef(false);

  // Show chat panel when we have an intake session
  const showChat = !!intakeUuid;

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

  const docCount = useMemo(() => {
    const docIds = new Set(allRows.map((r) => r.doc_id).filter(Boolean));
    return docIds.size;
  }, [allRows]);

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

  // Send opening briefing message once extraction data is loaded
  useEffect(() => {
    if (briefingSent.current || isLoading || !showChat || allRows.length === 0) return;
    briefingSent.current = true;

    const tileAreas = sections.map(s => s.label).join(', ');
    const conflictCount = sections.reduce((sum, s) => sum + s.statusCounts.conflict, 0);
    const lowConfCount = allRows.filter(r => r.confidence_score !== null && r.confidence_score < 0.6).length;

    let briefing = `I've analyzed ${docName || 'this document'}.`;
    if (docType) briefing += ` This appears to be a ${docType}.`;
    briefing += ` I found ${allRows.length} extractable fields across ${tileAreas}.`;

    if (conflictCount > 0 || lowConfCount > 0) {
      const flags: string[] = [];
      if (conflictCount > 0) flags.push(`${conflictCount} conflict${conflictCount !== 1 ? 's' : ''}`);
      if (lowConfCount > 0) flags.push(`${lowConfCount} low-confidence field${lowConfCount !== 1 ? 's' : ''}`);
      briefing += `\n\n${flags.join(' and ')} flagged for your attention. You can ask me about any field before committing.`;
    } else {
      briefing += '\n\nAll fields look good. You can review and commit when ready.';
    }

    // Send via Landscaper chat
    setTimeout(() => {
      chatRef.current?.sendMessage(briefing);
    }, 500);
  }, [isLoading, showChat, allRows, sections, docName, docType]);

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
        <span className="hdr-doc-count">
          <span className="pulse-dot" />
          {docCount} document{docCount !== 1 ? 's' : ''} processed
        </span>
        <span className="model-ready">
          Model ready: <span className="pct">{modelReadyPct}%</span>
        </span>
        <button
          className="btn-commit-all"
          onClick={() => commitAllAccepted(undefined as void)}
          disabled={totalAccepted === 0 || isCommitting}
        >
          {isCommitting
            ? 'Committing...'
            : `Commit All Accepted \u2192 Project`}
        </button>
        {onClose && (
          <button
            className="btn-action"
            onClick={onClose}
            title="Close workbench"
            style={{
              marginLeft: 4,
              width: 28,
              height: 28,
              borderRadius: 4,
              border: '1px solid rgba(255,255,255,.25)',
              background: 'transparent',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
            }}
          >
            ✕
          </button>
        )}
      </div>

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
            {filteredSections.length === 0 && (
              <div
                className="text-center py-10"
                style={{ color: 'var(--cui-secondary-color)', fontSize: 13 }}
              >
                {conflictsOnly
                  ? 'No conflicts to resolve.'
                  : 'No extraction data available for this project.'}
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
                onClick={() => commitAllAccepted(undefined as void)}
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
