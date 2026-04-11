'use client';

/**
 * IngestionRightPanel — Composite right panel for the Ingestion Workbench.
 *
 * Layout priority:
 *   1. ExtractionDiffPanel (conflict + new-field rows) — conditional, top
 *   2. ExtractionSummary (live field confirmation summary) — always visible
 *   3. children — extra content: RentRollMapper, error banners, etc.
 *
 * Auto-accepts all 'match' rows (extracted === existing) silently on mount.
 * These rows never appear in the UI.
 *
 * 💬 button in ExtractionDiffPanel pre-fills the Landscaper chat input via chatRef.
 * The user controls sending — it does NOT auto-send.
 */

import React, { useEffect, useRef } from 'react';
import type { LandscaperChatHandle } from '@/components/landscaper/LandscaperChatThreaded';
import type { StagingRow, StagingSection } from '@/hooks/useExtractionStaging';
import ExtractionSummary from './ExtractionSummary';
import ExtractionDiffPanel from './ExtractionDiffPanel';

// ─────────────────────────────────────────────────
// Simple value stringifier for discuss message
// ─────────────────────────────────────────────────

function toDiscussString(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'object') return JSON.stringify(val).slice(0, 100);
  const str = String(val);
  if (/^\d+\.00$/.test(str)) return str.replace(/\.00$/, '');
  return str;
}

// ─────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────

interface IngestionRightPanelProps {
  /** All non-rejected staging rows from useExtractionStaging */
  stagingRows: StagingRow[];
  /** Section groupings from useExtractionStaging (for ExtractionSummary groups) */
  sections: StagingSection[];
  /** Total row count including match rows (progress denominator) */
  totalExpected: number;
  /** Called when user clicks "Save to Project" */
  onCommit: () => void;
  isCommitting: boolean;
  docName?: string | null;
  /** Ref to Landscaper chat — 💬 discuss button calls setInputText on this */
  chatRef: React.RefObject<LandscaperChatHandle | null>;
  /** Approve mutation — marks row as accepted (use extracted value) */
  onApprove: (extractionId: number) => void;
  /** Reject mutation — marks row as rejected (discard / keep existing) */
  onReject: (extractionId: number) => void;
  /** Resolve conflict mutation — choose extracted or existing */
  onResolveConflict: (
    extractionId: number,
    choice: 'extracted' | 'existing',
  ) => void;
  /** Bulk-accept all match rows silently */
  onAcceptAllMatches: (scopes?: string[]) => void;
  /** Extra content rendered at the bottom (banners, RentRollMapper, etc.) */
  children?: React.ReactNode;
}

// ─────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────

export default function IngestionRightPanel({
  stagingRows,
  sections,
  totalExpected,
  onCommit,
  isCommitting,
  docName,
  chatRef,
  onApprove,
  onReject,
  onResolveConflict,
  onAcceptAllMatches,
  children,
}: IngestionRightPanelProps) {
  // ── Auto-accept match rows silently ──
  // Track IDs we've already bulk-accepted to avoid re-firing on every render.
  const matchAcceptedRef = useRef(false);

  useEffect(() => {
    const matchRows = stagingRows.filter((r) => r.status === 'match');
    if (matchRows.length > 0 && !matchAcceptedRef.current) {
      matchAcceptedRef.current = true;
      onAcceptAllMatches();
    }
  }, [stagingRows, onAcceptAllMatches]);

  // ── Derive row categories ──
  // conflict: extracted ≠ existing (both present)
  const conflictRows = stagingRows.filter((r) => r.status === 'conflict');
  // new: no existing value in DB
  const newFieldRows = stagingRows.filter((r) => r.status === 'new');
  // summary: everything except match (already auto-accepted) and rejected (filtered by hook)
  const summaryRows = stagingRows.filter((r) => r.status !== 'match');

  const hasDiffItems = conflictRows.length > 0 || newFieldRows.length > 0;

  // ── Handlers ──

  // For conflict rows: resolve with 'extracted' choice
  const handleAcceptConflict = (extractionId: number) => {
    onResolveConflict(extractionId, 'extracted');
  };

  // For conflict rows: resolve with 'existing' choice
  const handleKeepConflict = (extractionId: number) => {
    onResolveConflict(extractionId, 'existing');
  };

  // For new-field rows: accept = approve
  const handleAddNew = (extractionId: number) => {
    onApprove(extractionId);
  };

  // For new-field rows: skip = reject
  const handleSkipNew = (extractionId: number) => {
    onReject(extractionId);
  };

  // Unified accept handler: routes to correct mutation based on row type
  const handleAccept = (extractionId: number) => {
    const row = stagingRows.find((r) => r.extraction_id === extractionId);
    if (!row) return;
    if (row.status === 'conflict') handleAcceptConflict(extractionId);
    else handleAddNew(extractionId);
  };

  // Unified keep/skip handler
  const handleKeep = (extractionId: number) => {
    const row = stagingRows.find((r) => r.extraction_id === extractionId);
    if (!row) return;
    if (row.status === 'conflict') handleKeepConflict(extractionId);
    else handleSkipNew(extractionId);
  };

  // ── 💬 Discuss handler — pre-fills chat input, does NOT send ──
  const handleDiscuss = (
    fieldLabel: string,
    extractedValue: unknown,
    currentValue: unknown,
  ) => {
    if (!chatRef.current?.setInputText) return;
    const extractedStr = toDiscussString(extractedValue);
    const message =
      currentValue != null && currentValue !== ''
        ? `Let's discuss ${fieldLabel} — the document says ${extractedStr} but the project currently has ${toDiscussString(currentValue)}.`
        : `Let's discuss ${fieldLabel} — the document extracted a value of ${extractedStr} which is new to this project.`;
    chatRef.current.setInputText(message);
  };

  return (
    <div className="irp-container">
      {/* Diff panel — conditional, appears above summary when exceptions exist */}
      {hasDiffItems && (
        <ExtractionDiffPanel
          conflictRows={conflictRows}
          newRows={newFieldRows}
          onAccept={handleAccept}
          onKeep={handleKeep}
          onDiscuss={handleDiscuss}
        />
      )}

      {/* Live extraction summary — always visible */}
      <ExtractionSummary
        stagingRows={summaryRows}
        sections={sections}
        totalExpected={totalExpected}
        onCommit={onCommit}
        isCommitting={isCommitting}
        docName={docName}
      />

      {/* Extra content: RentRollMapper, error banners, floor plan prompt, etc. */}
      {children}
    </div>
  );
}
