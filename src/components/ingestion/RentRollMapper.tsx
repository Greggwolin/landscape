'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';

const DJANGO_API = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParsedColumn {
  source_header: string;
  source_index: number;
  sample_values: string[];
  suggested_target: string | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  is_bdba_split: boolean;
}

interface ParseResult {
  success: boolean;
  cache_key: string;
  doc_name: string;
  total_rows: number;
  columns: ParsedColumn[];
  target_fields: Record<string, string>;
  existing_unit_count: number;
}

interface ColumnMapping {
  source_index: number;
  target: string;  // target field key, '__bdba_split__', '__dynamic__', or '__skip__'
  dynamic_label?: string;
}

interface CommitResult {
  success: boolean;
  units_written: number;
  units_updated: number;
  dynamic_columns_created: string[];
  errors: Array<{ row_index: number; error: string }>;
}

interface RentRollMapperProps {
  projectId: number;
  docId: number;
  onCommitComplete?: (result: CommitResult) => void;
}

// ---------------------------------------------------------------------------
// Status badges
// ---------------------------------------------------------------------------

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const styles: Record<string, { bg: string; label: string }> = {
    high: { bg: 'var(--cui-success)', label: 'Auto' },
    medium: { bg: 'var(--cui-warning)', label: 'Suggested' },
    low: { bg: 'var(--cui-info)', label: 'Guess' },
    none: { bg: 'var(--cui-secondary-color)', label: 'Manual' },
  };
  const s = styles[confidence] || styles.none;
  return (
    <span
      className="rrm-confidence"
      style={{ background: s.bg }}
    >
      {s.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function RentRollMapper({
  projectId,
  docId,
  onCommitComplete,
}: RentRollMapperProps) {
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [mappings, setMappings] = useState<Record<number, ColumnMapping>>({});
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);

  // ── Parse mutation ────────────────────────
  const parseMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `${DJANGO_API}/api/knowledge/projects/${projectId}/rent-roll/parse-columns/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ doc_id: docId }),
        }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Parse failed (${res.status}): ${text}`);
      }
      return res.json() as Promise<ParseResult>;
    },
    onSuccess: (data) => {
      setParseResult(data);
      // Initialize mappings from suggested targets
      const initial: Record<number, ColumnMapping> = {};
      for (const col of data.columns) {
        if (col.is_bdba_split) {
          initial[col.source_index] = {
            source_index: col.source_index,
            target: '__bdba_split__',
          };
        } else if (col.suggested_target) {
          initial[col.source_index] = {
            source_index: col.source_index,
            target: col.suggested_target,
          };
        } else {
          initial[col.source_index] = {
            source_index: col.source_index,
            target: '__skip__',
          };
        }
      }
      setMappings(initial);
    },
  });

  // ── Commit mutation ───────────────────────
  const commitMutation = useMutation({
    mutationFn: async () => {
      if (!parseResult) throw new Error('No parse result');
      const mappingList = Object.values(mappings);
      const res = await fetch(
        `${DJANGO_API}/api/knowledge/projects/${projectId}/rent-roll/commit-mapping/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cache_key: parseResult.cache_key,
            mappings: mappingList,
          }),
        }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Commit failed (${res.status}): ${text}`);
      }
      return res.json() as Promise<CommitResult>;
    },
    onSuccess: (data) => {
      setCommitResult(data);
      onCommitComplete?.(data);
    },
  });

  // ── Handlers ──────────────────────────────
  const updateMapping = useCallback(
    (sourceIndex: number, target: string, dynamicLabel?: string) => {
      setMappings((prev) => ({
        ...prev,
        [sourceIndex]: {
          source_index: sourceIndex,
          target,
          dynamic_label: dynamicLabel,
        },
      }));
    },
    []
  );

  // Check for duplicate target assignments
  const duplicateTargets = useMemo(() => {
    if (!parseResult) return new Set<string>();
    const counts = new Map<string, number>();
    for (const m of Object.values(mappings)) {
      if (m.target && m.target !== '__skip__' && m.target !== '__dynamic__' && m.target !== '__bdba_split__') {
        counts.set(m.target, (counts.get(m.target) || 0) + 1);
      }
    }
    const dups = new Set<string>();
    for (const [t, c] of counts) {
      if (c > 1) dups.add(t);
    }
    return dups;
  }, [mappings, parseResult]);

  const hasUnitNumber = useMemo(() => {
    return Object.values(mappings).some(
      (m) => m.target === 'unit_number'
    );
  }, [mappings]);

  const mappedCount = useMemo(() => {
    return Object.values(mappings).filter(
      (m) => m.target !== '__skip__'
    ).length;
  }, [mappings]);

  // ── Loading state ─────────────────────────
  if (parseMutation.isPending) {
    return (
      <div className="rrm-loading">
        <div
          className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 mb-2"
          style={{ borderColor: 'var(--cui-primary)' }}
        />
        <p>Analyzing rent roll columns...</p>
      </div>
    );
  }

  // ── Parse error (must check BEFORE trigger button) ───
  if (parseMutation.isError) {
    return (
      <div className="rrm-error">
        <p>Failed to analyze rent roll columns.</p>
        <p style={{ fontSize: 11, opacity: 0.7 }}>
          {String(parseMutation.error instanceof Error ? parseMutation.error.message : parseMutation.error)}
        </p>
        <button
          className="rrm-trigger-btn"
          onClick={() => {
            parseMutation.reset();
            parseMutation.mutate();
          }}
          style={{ marginTop: 8 }}
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Not yet parsed: show trigger button ───
  if (!parseResult) {
    return (
      <div className="rrm-trigger">
        <div className="rrm-trigger-content">
          <div className="rrm-trigger-icon">⊞</div>
          <div className="rrm-trigger-text">
            <strong>Rent Roll Column Mapper</strong>
            <span>Map source columns to unit fields before committing</span>
          </div>
          <button
            className="rrm-trigger-btn"
            onClick={() => parseMutation.mutate()}
          >
            Analyze Columns
          </button>
        </div>
      </div>
    );
  }

  // ── Commit complete ───────────────────────
  if (commitResult) {
    return (
      <div className="rrm-complete">
        <div className="rrm-complete-icon">✓</div>
        <div className="rrm-complete-text">
          <strong>
            {commitResult.units_written} unit{commitResult.units_written !== 1 ? 's' : ''} created
            {commitResult.units_updated > 0 &&
              `, ${commitResult.units_updated} updated`}
          </strong>
          {commitResult.dynamic_columns_created.length > 0 && (
            <span>
              Dynamic columns: {commitResult.dynamic_columns_created.join(', ')}
            </span>
          )}
          {commitResult.errors.length > 0 && (
            <span style={{ color: 'var(--cui-danger)' }}>
              {commitResult.errors.length} row{commitResult.errors.length !== 1 ? 's' : ''} failed
            </span>
          )}
        </div>
      </div>
    );
  }

  // ── Mapper table ──────────────────────────
  if (!parseResult) return null;

  const targetOptions = [
    { value: '__skip__', label: '— Skip —' },
    { value: '__bdba_split__', label: '↔ BD/BA Split' },
    { value: '__dynamic__', label: '+ New Dynamic Column' },
    ...Object.entries(parseResult.target_fields).map(([key, label]) => ({
      value: key,
      label,
    })),
  ];

  return (
    <div className="rrm-mapper">
      {/* Mapper header */}
      <div className="rrm-header">
        <span className="rrm-title">Column Mapping</span>
        <span className="rrm-meta">
          {parseResult.total_rows} unit{parseResult.total_rows !== 1 ? 's' : ''} detected
        </span>
        {parseResult.existing_unit_count > 0 && (
          <span className="rrm-meta warn">
            {parseResult.existing_unit_count} existing unit{parseResult.existing_unit_count !== 1 ? 's' : ''} will be updated
          </span>
        )}
        <span style={{ flex: 1 }} />
        <span className="rrm-meta">
          {mappedCount}/{parseResult.columns.length} mapped
        </span>
        <button
          className="rrm-commit-btn"
          onClick={() => commitMutation.mutate()}
          disabled={
            !hasUnitNumber ||
            duplicateTargets.size > 0 ||
            commitMutation.isPending
          }
        >
          {commitMutation.isPending
            ? 'Committing...'
            : `Commit ${parseResult.total_rows} Units →`}
        </button>
      </div>

      {/* Validation warnings */}
      {!hasUnitNumber && (
        <div className="rrm-warn-bar">
          ⚠ Unit Number mapping is required
        </div>
      )}
      {duplicateTargets.size > 0 && (
        <div className="rrm-warn-bar">
          ⚠ Duplicate targets: {[...duplicateTargets].map(t => parseResult.target_fields[t] || t).join(', ')}
        </div>
      )}

      {/* Commit error */}
      {commitMutation.isError && (
        <div className="rrm-warn-bar" style={{ background: 'var(--cui-danger)', color: '#fff' }}>
          {String(commitMutation.error instanceof Error ? commitMutation.error.message : commitMutation.error)}
        </div>
      )}

      {/* Column headers */}
      <div className="rrm-col-headers">
        <span>Source Column</span>
        <span>Sample Values</span>
        <span>Map To</span>
        <span>Status</span>
      </div>

      {/* Mapping rows */}
      <div className="rrm-scroll">
        {parseResult.columns.map((col) => {
          const m = mappings[col.source_index];
          const target = m?.target || '__skip__';
          const isDuplicate =
            target !== '__skip__' &&
            target !== '__dynamic__' &&
            target !== '__bdba_split__' &&
            duplicateTargets.has(target);

          return (
            <div
              key={col.source_index}
              className={`rrm-row${isDuplicate ? ' duplicate' : ''}${target === '__skip__' ? ' skipped' : ''}`}
            >
              <div className="rrm-source">
                {col.source_header}
                {col.is_bdba_split && (
                  <span className="rrm-bdba-tag">BD/BA</span>
                )}
              </div>
              <div className="rrm-samples">
                {col.sample_values.slice(0, 3).map((v, i) => (
                  <span key={i} className="rrm-sample">{v}</span>
                ))}
              </div>
              <div className="rrm-target">
                <select
                  className="rrm-select"
                  value={target}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__dynamic__') {
                      const label = prompt(
                        'Dynamic column name:',
                        col.source_header
                      );
                      if (label) {
                        updateMapping(col.source_index, '__dynamic__', label);
                      }
                    } else {
                      updateMapping(col.source_index, val);
                    }
                  }}
                >
                  {targetOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {m?.dynamic_label && target === '__dynamic__' && (
                  <span className="rrm-dyn-label">{m.dynamic_label}</span>
                )}
              </div>
              <div className="rrm-status">
                <ConfidenceBadge confidence={col.confidence} />
                {isDuplicate && (
                  <span className="rrm-dup-warn">Duplicate</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
