'use client';

/**
 * ExtractionSummary — Live extraction summary panel for the Ingestion Workbench.
 *
 * Shows all non-rejected, non-match staging rows grouped by section (folder category).
 * Status dots update in real time as Landscaper confirms, corrects, or rejects fields
 * through chat. No per-row action buttons — confirmation happens through chat.
 *
 * Match rows (extracted === existing) are auto-accepted before reaching this component
 * and are never rendered here.
 *
 * A "Save to Project" button appears when all rows are resolved (accepted/applied).
 */

import React, { useState } from 'react';
import type { StagingRow, StagingSection } from '@/hooks/useExtractionStaging';

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
// Status helpers
// ─────────────────────────────────────────────────

type SummaryStatus = 'accepted' | 'pending' | 'conflict' | 'new';

function getRowStatus(row: StagingRow): SummaryStatus {
  const s = row.status;
  if (s === 'accepted' || s === 'applied') return 'accepted';
  if (s === 'conflict') return 'conflict';
  if (s === 'new') return 'new';
  return 'pending';
}

// ─────────────────────────────────────────────────
// Field row
// ─────────────────────────────────────────────────

function SummaryFieldRow({ row }: { row: StagingRow }) {
  const status = getRowStatus(row);
  const dotClass = {
    accepted: 'es-dot es-dot-accepted',
    pending:  'es-dot es-dot-pending',
    conflict: 'es-dot es-dot-conflict',
    new:      'es-dot es-dot-new',
  }[status];

  const displayVal = formatValue(row.extracted_value);

  return (
    <div className="es-field-row">
      <span className={dotClass} />
      <span className="es-field-label">{row.field_label}</span>
      <span className="es-field-value">
        {displayVal || <span className="es-empty-val">—</span>}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────

interface ExtractionSummaryProps {
  /** Non-rejected, non-match staging rows */
  stagingRows: StagingRow[];
  /** Section groupings from useExtractionStaging (for collapsible groups) */
  sections: StagingSection[];
  /** Denominator for progress bar (includes match rows that were auto-accepted) */
  totalExpected: number;
  onCommit: () => void;
  isCommitting: boolean;
  docName?: string | null;
}

export default function ExtractionSummary({
  stagingRows,
  sections,
  totalExpected,
  onCommit,
  isCommitting,
  docName,
}: ExtractionSummaryProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Count confirmed (accepted/applied) rows for progress
  const confirmedCount = stagingRows.filter(
    (r) => r.status === 'accepted' || r.status === 'applied',
  ).length;

  // All rows resolved when every row is accepted/applied (pending = unresolved)
  const allResolved =
    stagingRows.length > 0 &&
    stagingRows.every((r) => r.status === 'accepted' || r.status === 'applied');

  const progressPct =
    totalExpected > 0 ? Math.round((confirmedCount / totalExpected) * 100) : 0;

  const toggleSection = (id: string) =>
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  // Build a set of extraction IDs that belong to sections (for orphan detection)
  const sectionRowIds = new Set(
    sections.flatMap((s) => s.rows.map((r) => r.extraction_id)),
  );

  // Section rows: exclude match rows (auto-accepted, never shown)
  const visibleSections = sections
    .map((sec) => ({
      ...sec,
      rows: sec.rows.filter((r) => r.status !== 'match'),
    }))
    .filter((sec) => sec.rows.length > 0);

  // Orphan rows not captured by any section
  const orphanRows = stagingRows.filter(
    (r) => !sectionRowIds.has(r.extraction_id) && r.status !== 'match',
  );

  return (
    <div className="es-container">
      {/* ── Progress header ── */}
      <div className="es-header">
        <div className="es-header-top">
          <span className="es-doc-name">{docName || 'Extraction Summary'}</span>
          <span className="es-progress-text">
            {confirmedCount} of {totalExpected} confirmed
          </span>
        </div>
        <div className="es-progress-bar-track">
          <div
            className="es-progress-bar-fill"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* ── Field groups ── */}
      <div className="es-groups">
        {visibleSections.map((section) => (
          <div key={section.id} className="es-group">
            <button
              className="es-group-header"
              onClick={() => toggleSection(section.id)}
            >
              <span className="es-group-label">{section.label}</span>
              <span className="es-group-badge">{section.rows.length}</span>
              <span
                className={`es-chevron${collapsed[section.id] ? ' collapsed' : ''}`}
              >
                ▼
              </span>
            </button>
            {!collapsed[section.id] && (
              <div className="es-group-rows">
                {section.rows.map((row) => (
                  <SummaryFieldRow key={row.extraction_id} row={row} />
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Orphan rows not captured by any section */}
        {orphanRows.length > 0 && (
          <div className="es-group">
            <button
              className="es-group-header"
              onClick={() => toggleSection('_orphan')}
            >
              <span className="es-group-label">Other</span>
              <span className="es-group-badge">{orphanRows.length}</span>
              <span
                className={`es-chevron${collapsed['_orphan'] ? ' collapsed' : ''}`}
              >
                ▼
              </span>
            </button>
            {!collapsed['_orphan'] && (
              <div className="es-group-rows">
                {orphanRows.map((row) => (
                  <SummaryFieldRow key={row.extraction_id} row={row} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {visibleSections.length === 0 && orphanRows.length === 0 && (
          <div className="es-empty">
            {stagingRows.length === 0 ? (
              <span style={{ color: 'var(--cui-secondary-color)', fontSize: 13 }}>
                Waiting for extraction…
              </span>
            ) : (
              <span style={{ color: 'var(--cui-success)', fontSize: 13 }}>
                All fields confirmed
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Save to Project button (appears when all resolved) ── */}
      {allResolved && (
        <div className="es-commit-footer">
          <button
            className="btn btn-success btn-sm es-commit-btn"
            onClick={onCommit}
            disabled={isCommitting}
          >
            {isCommitting ? 'Saving…' : 'Save to Project'}
          </button>
        </div>
      )}
    </div>
  );
}
