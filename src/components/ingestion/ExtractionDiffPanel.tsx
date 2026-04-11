'use client';

/**
 * ExtractionDiffPanel — Exception-only diff view for the Ingestion Workbench.
 *
 * Appears automatically when staging data contains conflict or new-field rows.
 * Matched fields (extracted === existing) are NEVER shown — they're auto-accepted.
 *
 * Each row: field label | new value | current value | action buttons.
 * Rows fade out after resolution. Component returns null when all rows resolved.
 *
 * Row types:
 *  - Conflict: both values shown, amber left border. Actions: Accept / Keep / 💬
 *  - New field: current = "—". Actions: Add / Skip / 💬
 */

import React, { useState } from 'react';
import CIcon from '@coreui/icons-react';
import { cilCommentSquare } from '@coreui/icons';
import type { StagingRow } from '@/hooks/useExtractionStaging';

// ─────────────────────────────────────────────────
// Value formatter
// ─────────────────────────────────────────────────

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object' && val !== null) {
    if (Array.isArray(val)) {
      const len = (val as unknown[]).length;
      return len === 0 ? '' : `[${len} item${len !== 1 ? 's' : ''}]`;
    }
    const entries = Object.entries(val as Record<string, unknown>)
      .filter(([, v]) => v !== null && v !== undefined)
      .slice(0, 3);
    if (entries.length === 0) return '';
    return entries.map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`).join(' · ');
  }
  const str = String(val);
  if (/^\d+\.00$/.test(str)) return str.replace(/\.00$/, '');
  return str;
}

// ─────────────────────────────────────────────────
// Diff row sub-component
// ─────────────────────────────────────────────────

function DiffRow({
  row,
  isConflict,
  isResolving,
  onAccept,
  onKeep,
  onDiscuss,
}: {
  row: StagingRow;
  isConflict: boolean;
  isResolving: boolean;
  onAccept: () => void;
  onKeep: () => void;
  onDiscuss: () => void;
}) {
  const extractedDisplay = formatValue(row.extracted_value) || '—';
  const existingDisplay = isConflict ? (formatValue(row.existing_value) || '—') : null;

  return (
    <div
      className={`edp-row${isResolving ? ' resolving' : ''}${isConflict ? ' conflict' : ' new-field'}`}
    >
      <span className="edp-row-field">{row.field_label}</span>

      <span className={`edp-row-new-val${isConflict ? ' is-conflict' : ' is-new'}`}>
        {extractedDisplay}
      </span>

      <span className="edp-row-current-val">
        {isConflict ? (
          existingDisplay
        ) : (
          <span className="edp-no-current">—</span>
        )}
      </span>

      <div className="edp-row-actions">
        <button
          className="btn btn-ghost-success btn-sm"
          onClick={onAccept}
          disabled={isResolving}
          title={isConflict ? 'Use extracted value' : 'Add to project'}
        >
          {isConflict ? 'Accept' : 'Add'}
        </button>
        <button
          className="btn btn-ghost-secondary btn-sm"
          onClick={onKeep}
          disabled={isResolving}
          title={isConflict ? 'Keep existing value' : 'Skip this field'}
        >
          {isConflict ? 'Keep' : 'Skip'}
        </button>
        <button
          className="btn btn-ghost-secondary btn-sm edp-discuss-btn"
          onClick={onDiscuss}
          disabled={isResolving}
          title="Discuss in Landscaper chat"
        >
          <CIcon icon={cilCommentSquare} size="sm" />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────

type FilterPill = 'conflicts' | 'new';

interface ExtractionDiffPanelProps {
  conflictRows: StagingRow[];
  newRows: StagingRow[];
  /** Accept extracted value — for conflicts: use new; for new fields: add to project */
  onAccept: (extractionId: number) => void;
  /** Keep existing — for conflicts: keep current; for new fields: skip */
  onKeep: (extractionId: number) => void;
  /** Pre-fill Landscaper chat input with a discussion prompt (does NOT auto-send) */
  onDiscuss: (fieldLabel: string, extractedValue: unknown, currentValue: unknown) => void;
}

export default function ExtractionDiffPanel({
  conflictRows,
  newRows,
  onAccept,
  onKeep,
  onDiscuss,
}: ExtractionDiffPanelProps) {
  const [activeFilter, setActiveFilter] = useState<FilterPill>('conflicts');
  // Track rows currently fading out (resolving animation in progress)
  const [resolving, setResolving] = useState<Set<number>>(new Set());

  const hasConflicts = conflictRows.length > 0;
  const hasNew = newRows.length > 0;

  // Auto-switch to "new" tab if conflicts tab has nothing to show
  const effectiveFilter: FilterPill =
    activeFilter === 'conflicts' && !hasConflicts && hasNew ? 'new' : activeFilter;

  const visibleRows = effectiveFilter === 'conflicts' ? conflictRows : newRows;

  // Nothing to show — collapse entirely
  if (!hasConflicts && !hasNew) return null;

  const handleResolve = (extractionId: number, action: 'accept' | 'keep') => {
    // Mark as resolving to trigger fade-out animation
    setResolving((prev) => new Set(prev).add(extractionId));
    // Fire mutation after CSS transition completes (300ms)
    setTimeout(() => {
      if (action === 'accept') onAccept(extractionId);
      else onKeep(extractionId);
    }, 280);
  };

  const totalItems = conflictRows.length + newRows.length;

  return (
    <div className="edp-container">
      {/* ── Header ── */}
      <div className="edp-header">
        <div className="edp-header-top">
          <span className="edp-title">Review Changes</span>
          <span className="edp-attention-badge">
            {totalItems} item{totalItems !== 1 ? 's' : ''} need attention
          </span>
        </div>
        <div className="edp-pills">
          {hasConflicts && (
            <button
              className={`edp-pill edp-pill-conflict${
                effectiveFilter === 'conflicts' ? ' active' : ''
              }`}
              onClick={() => setActiveFilter('conflicts')}
            >
              Conflicts ({conflictRows.length})
            </button>
          )}
          {hasNew && (
            <button
              className={`edp-pill edp-pill-new${
                effectiveFilter === 'new' ? ' active' : ''
              }`}
              onClick={() => setActiveFilter('new')}
            >
              New Fields ({newRows.length})
            </button>
          )}
        </div>
      </div>

      {/* ── Column headers ── */}
      <div className="edp-col-headers">
        <span className="edp-col-field">Field</span>
        <span className="edp-col-new">New Value</span>
        <span className="edp-col-current">Current Value</span>
        <span className="edp-col-actions" />
      </div>

      {/* ── Rows ── */}
      <div className="edp-rows">
        {visibleRows.map((row) => (
          <DiffRow
            key={row.extraction_id}
            row={row}
            isConflict={effectiveFilter === 'conflicts'}
            isResolving={resolving.has(row.extraction_id)}
            onAccept={() => handleResolve(row.extraction_id, 'accept')}
            onKeep={() => handleResolve(row.extraction_id, 'keep')}
            onDiscuss={() =>
              onDiscuss(row.field_label, row.extracted_value, row.existing_value)
            }
          />
        ))}
        {visibleRows.length === 0 && (
          <div className="edp-empty">
            <span style={{ color: 'var(--cui-secondary-color)', fontSize: 12 }}>
              All {effectiveFilter === 'conflicts' ? 'conflicts' : 'new fields'} resolved
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
