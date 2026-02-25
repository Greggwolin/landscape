'use client';

/**
 * MappingScreen — Intelligence v1 Phase 3
 *
 * Shows source columns from a document matched to canonical field registry entries.
 * Users can confirm auto-matched fields, reassign unmatched ones, or skip columns.
 * On lock, advances the intake session from 'draft' to 'mapping_complete'.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CBadge,
  CButton,
  CFormSelect,
  CSpinner,
  CProgress,
} from '@coreui/react';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

// ============================================
// TYPES
// ============================================

interface MappingSuggestion {
  sourceColumn: string;
  fieldKey: string;
  label: string;
  confidence: number;
  dbTarget: string;
  dbWriteType: string;
  scope: string;
  isDynamic: boolean;
}

interface RegistryField {
  fieldKey: string;
  label: string;
  fieldType: string;
  scope: string;
  dbTarget: string;
  dbWriteType: string;
  extractability: string;
  extractPolicy: string;
  isDynamic: boolean;
}

interface MappingScreenProps {
  intakeUuid: string;
  projectId: number;
  sourceColumns?: string[];
  onMappingLocked?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
}

// ============================================
// CONFIDENCE HELPERS
// ============================================

function confidenceColor(c: number): string {
  if (c >= 0.8) return 'success';
  if (c >= 0.5) return 'warning';
  if (c > 0) return 'danger';
  return 'secondary';
}

function confidenceLabel(c: number): string {
  if (c >= 0.8) return 'High';
  if (c >= 0.5) return 'Medium';
  if (c > 0) return 'Low';
  return 'No match';
}

// ============================================
// COMPONENT
// ============================================

export default function MappingScreen({
  intakeUuid,
  projectId,
  sourceColumns = [],
  onMappingLocked,
  onComplete,
  onCancel,
}: MappingScreenProps) {
  const handleLocked = useMemo(() => onMappingLocked || onComplete || (() => {}), [onMappingLocked, onComplete]);
  const [suggestions, setSuggestions] = useState<MappingSuggestion[]>([]);
  const [registry, setRegistry] = useState<RegistryField[]>([]);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [locking, setLocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch suggestions and registry on mount
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Fetch fuzzy match suggestions (POST)
        const sugRes = await fetch(
          `${DJANGO_API_URL}/api/intake/${intakeUuid}/mapping_suggestions/`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source_columns: sourceColumns }),
          }
        );
        if (!sugRes.ok) throw new Error('Failed to fetch mapping suggestions');
        const sugData = await sugRes.json();

        // Fetch full registry (GET)
        const regRes = await fetch(
          `${DJANGO_API_URL}/api/intake/${intakeUuid}/mapping_suggestions/`
        );
        if (!regRes.ok) throw new Error('Failed to fetch field registry');
        const regData = await regRes.json();

        setSuggestions(sugData.mappings || []);
        setRegistry(regData.suggestions || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load mapping data');
      } finally {
        setLoading(false);
      }
    }

    if (intakeUuid && sourceColumns.length > 0) {
      void load();
    }
  }, [intakeUuid, sourceColumns]);

  // Build registry options for dropdown
  const registryOptions = useMemo(() => {
    return registry
      .sort((a, b) => a.label.localeCompare(b.label))
      .map((f) => ({
        value: f.fieldKey,
        label: `${f.label} (${f.scope})`,
      }));
  }, [registry]);

  // Get the effective field key for a source column
  const getEffectiveFieldKey = useCallback(
    (sourceColumn: string): string => {
      if (overrides[sourceColumn]) return overrides[sourceColumn];
      const suggestion = suggestions.find((s) => s.sourceColumn === sourceColumn);
      return suggestion?.fieldKey || '';
    },
    [overrides, suggestions]
  );

  // Compute summary stats
  const stats = useMemo(() => {
    const matched = sourceColumns.filter(
      (col) => !skipped.has(col) && getEffectiveFieldKey(col)
    ).length;
    const unmatched = sourceColumns.filter(
      (col) => !skipped.has(col) && !getEffectiveFieldKey(col)
    ).length;
    const skippedCount = skipped.size;
    return { matched, unmatched, skipped: skippedCount, total: sourceColumns.length };
  }, [sourceColumns, skipped, getEffectiveFieldKey]);

  // Handle override selection
  const handleOverride = useCallback((sourceColumn: string, fieldKey: string) => {
    setOverrides((prev) => ({
      ...prev,
      [sourceColumn]: fieldKey,
    }));
    setSkipped((prev) => {
      const next = new Set(prev);
      next.delete(sourceColumn);
      return next;
    });
  }, []);

  // Toggle skip
  const handleToggleSkip = useCallback((sourceColumn: string) => {
    setSkipped((prev) => {
      const next = new Set(prev);
      if (next.has(sourceColumn)) {
        next.delete(sourceColumn);
      } else {
        next.add(sourceColumn);
      }
      return next;
    });
  }, []);

  // Lock mapping
  const handleLockMapping = useCallback(async () => {
    setLocking(true);
    setError(null);
    try {
      const response = await fetch(
        `${DJANGO_API_URL}/api/intake/${intakeUuid}/lock_mapping/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mappings: sourceColumns
              .filter((col) => !skipped.has(col) && getEffectiveFieldKey(col))
              .map((col) => ({
                source_column: col,
                field_key: getEffectiveFieldKey(col),
              })),
          }),
        }
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to lock mapping');
      }

      handleLocked();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to lock mapping');
    } finally {
      setLocking(false);
    }
  }, [intakeUuid, sourceColumns, skipped, getEffectiveFieldKey, handleLocked]);

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center p-5">
        <CSpinner size="sm" className="me-2" />
        <span style={{ color: 'var(--cui-secondary-color)' }}>Loading mapping suggestions...</span>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-3">
      {/* Header with stats */}
      <CCard>
        <CCardHeader className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <strong>Column Mapping</strong>
            <CBadge color="info" shape="rounded-pill">
              {stats.total} columns
            </CBadge>
          </div>
          <div className="d-flex align-items-center gap-2">
            <CBadge color="success">{stats.matched} mapped</CBadge>
            {stats.unmatched > 0 && (
              <CBadge color="warning">{stats.unmatched} unmatched</CBadge>
            )}
            {stats.skipped > 0 && (
              <CBadge color="secondary">{stats.skipped} skipped</CBadge>
            )}
          </div>
        </CCardHeader>
        <CCardBody className="py-2">
          <CProgress
            value={(stats.matched / Math.max(stats.total, 1)) * 100}
            color="success"
            style={{ height: '6px' }}
          />
          <div className="text-xs mt-1" style={{ color: 'var(--cui-secondary-color)' }}>
            {Math.round((stats.matched / Math.max(stats.total, 1)) * 100)}% of columns mapped to registry fields
          </div>
        </CCardBody>
      </CCard>

      {error && (
        <div className="alert alert-danger mb-0" style={{ fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Mapping rows */}
      <CCard>
        <CCardBody className="p-0">
          <table className="table table-sm mb-0" style={{ fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
                <th style={{ width: '30%' }}>Source Column</th>
                <th style={{ width: '35%' }}>Mapped To</th>
                <th style={{ width: '15%', textAlign: 'center' }}>Confidence</th>
                <th style={{ width: '20%', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((suggestion) => {
                const isSkipped = skipped.has(suggestion.sourceColumn);
                const effectiveKey = getEffectiveFieldKey(suggestion.sourceColumn);
                const isOverridden = !!overrides[suggestion.sourceColumn];
                const conf = isOverridden ? 1.0 : suggestion.confidence;

                return (
                  <tr
                    key={suggestion.sourceColumn}
                    style={{
                      opacity: isSkipped ? 0.4 : 1,
                      textDecoration: isSkipped ? 'line-through' : 'none',
                    }}
                  >
                    <td className="align-middle">
                      <code style={{ fontSize: '0.8rem' }}>{suggestion.sourceColumn}</code>
                    </td>
                    <td className="align-middle">
                      {isSkipped ? (
                        <span className="text-muted">Skipped</span>
                      ) : (
                        <CFormSelect
                          size="sm"
                          value={effectiveKey}
                          onChange={(e) =>
                            handleOverride(suggestion.sourceColumn, e.target.value)
                          }
                          style={{ fontSize: '0.8rem' }}
                        >
                          <option value="">-- Select field --</option>
                          {registryOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </CFormSelect>
                      )}
                    </td>
                    <td className="align-middle text-center">
                      {!isSkipped && effectiveKey && (
                        <CBadge
                          color={confidenceColor(conf)}
                          shape="rounded-pill"
                          style={{ fontSize: '0.7rem' }}
                        >
                          {confidenceLabel(conf)}
                          {isOverridden && ' (manual)'}
                        </CBadge>
                      )}
                    </td>
                    <td className="align-middle text-center">
                      <CButton
                        size="sm"
                        color={isSkipped ? 'outline-primary' : 'outline-secondary'}
                        onClick={() => handleToggleSkip(suggestion.sourceColumn)}
                        style={{ fontSize: '0.7rem' }}
                      >
                        {isSkipped ? 'Unskip' : 'Skip'}
                      </CButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CCardBody>
      </CCard>

      {/* Action buttons */}
      <div className="d-flex justify-content-between">
        <CButton color="secondary" variant="outline" onClick={onCancel}>
          Cancel
        </CButton>
        <CButton
          color="primary"
          onClick={handleLockMapping}
          disabled={locking || stats.matched === 0}
        >
          {locking ? (
            <>
              <CSpinner size="sm" className="me-1" />
              Locking...
            </>
          ) : (
            `Lock Mapping (${stats.matched} fields)`
          )}
        </CButton>
      </div>
    </div>
  );
}
