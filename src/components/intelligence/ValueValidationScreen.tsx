'use client';

/**
 * ValueValidationScreen — Intelligence v1 Phase 4
 *
 * Displays extracted values from ai_extraction_staging alongside existing
 * project values. Shows conflict flags and lets users accept, reject, or
 * override individual values before committing.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CBadge,
  CButton,
  CFormInput,
  CSpinner,
  CTooltip,
} from '@coreui/react';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

// ============================================
// TYPES
// ============================================

interface ExtractedValue {
  extraction_id: number;
  field_key: string;
  extracted_value: string;
  confidence_score: number;
  status: string;
  conflict_with_extraction_id: number | null;
  extraction_type: string;
}

type Decision = 'accept' | 'reject' | 'override';

interface FieldDecision {
  decision: Decision;
  overrideValue?: string;
}

interface ValueValidationScreenProps {
  intakeUuid: string;
  projectId: number;
  onCommit?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
}

// ============================================
// HELPERS
// ============================================

function confidenceColor(score: number): string {
  if (score >= 0.8) return 'success';
  if (score >= 0.5) return 'warning';
  return 'danger';
}

// ============================================
// COMPONENT
// ============================================

export default function ValueValidationScreen({
  intakeUuid,
  projectId,
  onCommit,
  onComplete,
  onCancel,
}: ValueValidationScreenProps) {
   
  const onCommitDone = useMemo(() => onCommit || onComplete || (() => {}), [onCommit, onComplete]);
  const [values, setValues] = useState<ExtractedValue[]>([]);
  const [decisions, setDecisions] = useState<Record<number, FieldDecision>>({});
  const [loading, setLoading] = useState(true);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load extracted values
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${DJANGO_API_URL}/api/intake/${intakeUuid}/extracted_values/`
        );
        if (!res.ok) throw new Error('Failed to load extracted values');
        const data = await res.json();
        const vals: ExtractedValue[] = data.values || [];
        setValues(vals);

        // Auto-accept high confidence, non-conflicting values
        const auto: Record<number, FieldDecision> = {};
        for (const v of vals) {
          if (v.confidence_score >= 0.8 && !v.conflict_with_extraction_id) {
            auto[v.extraction_id] = { decision: 'accept' };
          }
        }
        setDecisions(auto);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load values');
      } finally {
        setLoading(false);
      }
    }

    if (intakeUuid) void load();
  }, [intakeUuid]);

  // Stats
  const stats = useMemo(() => {
    const accepted = Object.values(decisions).filter((d) => d.decision === 'accept' || d.decision === 'override').length;
    const rejected = Object.values(decisions).filter((d) => d.decision === 'reject').length;
    const pending = values.length - Object.keys(decisions).length;
    const conflicts = values.filter((v) => v.conflict_with_extraction_id).length;
    return { accepted, rejected, pending, conflicts, total: values.length };
  }, [values, decisions]);

  // Set decision
  const setDecision = useCallback((extractionId: number, decision: Decision, overrideValue?: string) => {
    setDecisions((prev) => ({
      ...prev,
      [extractionId]: { decision, overrideValue },
    }));
  }, []);

  // Accept all undecided
  const handleAcceptAll = useCallback(() => {
    setDecisions((prev) => {
      const next = { ...prev };
      for (const v of values) {
        if (!next[v.extraction_id]) {
          next[v.extraction_id] = { decision: 'accept' };
        }
      }
      return next;
    });
  }, [values]);

  // Commit decisions
  const handleCommit = useCallback(async () => {
    setCommitting(true);
    setError(null);
    try {
      const actions = Object.entries(decisions).map(([extractionId, d]) => ({
        extraction_id: parseInt(extractionId),
        action: d.decision === 'reject' ? 'reject' : 'accept',
        override_value: d.overrideValue || null,
      }));

      const res = await fetch(
        `${DJANGO_API_URL}/api/intake/${intakeUuid}/commit_values/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actions }),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Commit failed');
      }

      onCommitDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Commit failed');
    } finally {
      setCommitting(false);
    }
  }, [intakeUuid, decisions, onCommitDone]);

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center p-5">
        <CSpinner size="sm" className="me-2" />
        <span style={{ color: 'var(--cui-secondary-color)' }}>Loading extracted values...</span>
      </div>
    );
  }

  if (values.length === 0) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>&#128196;</div>
          <div style={{ color: 'var(--cui-secondary-color)' }}>
            No extracted values found for this intake session.
          </div>
          <CButton color="secondary" variant="outline" className="mt-3" onClick={onCancel}>
            Back
          </CButton>
        </CCardBody>
      </CCard>
    );
  }

  return (
    <div className="d-flex flex-column gap-3">
      {/* Summary header */}
      <CCard>
        <CCardHeader className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <strong>Value Validation</strong>
            <CBadge color="info" shape="rounded-pill">{stats.total} values</CBadge>
          </div>
          <div className="d-flex align-items-center gap-2">
            <CBadge color="success">{stats.accepted} accepted</CBadge>
            <CBadge color="danger">{stats.rejected} rejected</CBadge>
            {stats.pending > 0 && <CBadge color="warning">{stats.pending} pending</CBadge>}
            {stats.conflicts > 0 && <CBadge color="dark">{stats.conflicts} conflicts</CBadge>}
          </div>
        </CCardHeader>
        <CCardBody className="d-flex gap-2 py-2">
          <CButton size="sm" color="success" variant="outline" onClick={handleAcceptAll}>
            Accept All Remaining
          </CButton>
        </CCardBody>
      </CCard>

      {error && (
        <div className="alert alert-danger mb-0" style={{ fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Value rows */}
      <CCard>
        <CCardBody className="p-0">
          <table className="table table-sm mb-0" style={{ fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
                <th style={{ width: '25%' }}>Field</th>
                <th style={{ width: '25%' }}>Extracted Value</th>
                <th style={{ width: '10%', textAlign: 'center' }}>Confidence</th>
                <th style={{ width: '10%', textAlign: 'center' }}>Status</th>
                <th style={{ width: '30%', textAlign: 'center' }}>Decision</th>
              </tr>
            </thead>
            <tbody>
              {values.map((v) => {
                const decision = decisions[v.extraction_id];
                const isConflict = !!v.conflict_with_extraction_id;
                const decisionType = decision?.decision;

                return (
                  <tr
                    key={v.extraction_id}
                    style={{
                      borderLeft: isConflict ? '3px solid var(--cui-warning)' : undefined,
                      backgroundColor: decisionType === 'reject'
                        ? 'rgba(var(--cui-danger-rgb), 0.05)'
                        : decisionType === 'accept' || decisionType === 'override'
                          ? 'rgba(var(--cui-success-rgb), 0.05)'
                          : undefined,
                    }}
                  >
                    <td className="align-middle">
                      <code style={{ fontSize: '0.8rem' }}>{v.field_key}</code>
                      {isConflict && (
                        <CTooltip content="This value conflicts with a previous extraction">
                          <span className="ms-1" style={{ cursor: 'help' }}>&#9888;&#65039;</span>
                        </CTooltip>
                      )}
                    </td>
                    <td className="align-middle">
                      {decisionType === 'override' ? (
                        <CFormInput
                          size="sm"
                          value={decision?.overrideValue || v.extracted_value}
                          onChange={(e) =>
                            setDecision(v.extraction_id, 'override', e.target.value)
                          }
                          style={{ fontSize: '0.8rem' }}
                        />
                      ) : (
                        <span>{v.extracted_value}</span>
                      )}
                    </td>
                    <td className="align-middle text-center">
                      <CBadge
                        color={confidenceColor(v.confidence_score)}
                        style={{ fontSize: '0.7rem' }}
                      >
                        {Math.round(v.confidence_score * 100)}%
                      </CBadge>
                    </td>
                    <td className="align-middle text-center">
                      <span
                        className="text-xs"
                        style={{ color: 'var(--cui-secondary-color)' }}
                      >
                        {v.status}
                      </span>
                    </td>
                    <td className="align-middle text-center">
                      <div className="d-flex gap-1 justify-content-center">
                        <CButton
                          size="sm"
                          color={decisionType === 'accept' ? 'success' : 'outline-success'}
                          onClick={() => setDecision(v.extraction_id, 'accept')}
                          style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                        >
                          Accept
                        </CButton>
                        <CButton
                          size="sm"
                          color={decisionType === 'reject' ? 'danger' : 'outline-danger'}
                          onClick={() => setDecision(v.extraction_id, 'reject')}
                          style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                        >
                          Reject
                        </CButton>
                        <CButton
                          size="sm"
                          color={decisionType === 'override' ? 'primary' : 'outline-primary'}
                          onClick={() =>
                            setDecision(v.extraction_id, 'override', v.extracted_value)
                          }
                          style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                        >
                          Edit
                        </CButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CCardBody>
      </CCard>

      {/* Actions */}
      <div className="d-flex justify-content-between">
        <CButton color="secondary" variant="outline" onClick={onCancel}>
          Back
        </CButton>
        <CButton
          color="primary"
          onClick={handleCommit}
          disabled={committing || stats.pending > 0}
        >
          {committing ? (
            <>
              <CSpinner size="sm" className="me-1" />
              Committing...
            </>
          ) : (
            `Commit ${stats.accepted} Values`
          )}
        </CButton>
      </div>
    </div>
  );
}
