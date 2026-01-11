'use client';

import React, { useState } from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CBadge,
  CSpinner,
  CCollapse,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilCheckCircle, cilXCircle, cilWarning, cilChevronBottom, cilChevronTop } from '@coreui/icons';

// =============================================================================
// Types
// =============================================================================

export interface MutationProposal {
  mutation_id?: string;
  mutationId?: string;
  mutation_type?: string;
  mutationType?: string;
  table?: string;
  table_name?: string;
  field?: string | null;
  field_name?: string | null;
  record_id?: string | null;
  recordId?: string | null;
  current_value?: unknown;
  currentValue?: unknown;
  proposed_value?: unknown;
  proposedValue?: unknown;
  reason?: string;
  is_high_risk?: boolean;
  isHighRisk?: boolean;
  expires_at?: string;
  expiresAt?: string;
  batch_id?: string;
  batchId?: string;
}

interface MutationProposalCardProps {
  proposals: MutationProposal[];
  onConfirm: (mutationId: string) => Promise<void>;
  onReject: (mutationId: string) => Promise<void>;
  onConfirmAll?: (batchId: string) => Promise<void>;
}

// =============================================================================
// Helpers
// =============================================================================

function normalizeProposal(p: MutationProposal) {
  return {
    mutationId: p.mutation_id || p.mutationId || '',
    mutationType: p.mutation_type || p.mutationType || 'field_update',
    table: p.table || p.table_name || '',
    field: p.field || p.field_name || null,
    recordId: p.record_id || p.recordId || null,
    currentValue: p.current_value ?? p.currentValue ?? null,
    proposedValue: p.proposed_value ?? p.proposedValue ?? null,
    reason: p.reason || '',
    isHighRisk: p.is_high_risk ?? p.isHighRisk ?? false,
    expiresAt: p.expires_at || p.expiresAt || '',
    batchId: p.batch_id || p.batchId || null,
  };
}

function formatFieldName(field: string | null): string {
  if (!field) return 'Record';
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTableName(table: string): string {
  return table
    .replace('tbl_', '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '(empty)';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function getExpirationMinutes(expiresAt: string): number {
  if (!expiresAt) return 60;
  const expDate = new Date(expiresAt);
  const now = new Date();
  return Math.max(0, Math.round((expDate.getTime() - now.getTime()) / 60000));
}

// =============================================================================
// Component
// =============================================================================

export function MutationProposalCard({
  proposals,
  onConfirm,
  onReject,
  onConfirmAll,
}: MutationProposalCardProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(true);

  // Normalize proposals
  const normalizedProposals = proposals.map(normalizeProposal);
  const pendingProposals = normalizedProposals.filter(
    (p) => !resolvedIds.has(p.mutationId)
  );
  const highRiskCount = pendingProposals.filter((p) => p.isHighRisk).length;
  const batchId = normalizedProposals[0]?.batchId;

  // Handlers
  const handleConfirm = async (mutationId: string) => {
    setLoadingId(mutationId);
    try {
      await onConfirm(mutationId);
      setResolvedIds((prev) => new Set([...prev, mutationId]));
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (mutationId: string) => {
    setLoadingId(mutationId);
    try {
      await onReject(mutationId);
      setResolvedIds((prev) => new Set([...prev, mutationId]));
    } finally {
      setLoadingId(null);
    }
  };

  const handleConfirmAll = async () => {
    if (!batchId || !onConfirmAll) return;
    setLoadingId('batch');
    try {
      await onConfirmAll(batchId);
      setResolvedIds(new Set(normalizedProposals.map((p) => p.mutationId)));
    } finally {
      setLoadingId(null);
    }
  };

  // All resolved
  if (pendingProposals.length === 0) {
    return (
      <div
        className="rounded-lg px-4 py-3 text-sm d-flex align-items-center gap-2"
        style={{
          backgroundColor: 'var(--cui-success-bg-subtle, #d1e7dd)',
          color: 'var(--cui-success, #198754)',
          border: '1px solid var(--cui-success, #198754)',
        }}
      >
        <CIcon icon={cilCheckCircle} size="sm" />
        All proposed changes have been processed.
      </div>
    );
  }

  const expiresInMinutes = getExpirationMinutes(pendingProposals[0]?.expiresAt || '');

  return (
    <CCard
      className="border-warning"
      style={{
        backgroundColor: 'var(--cui-warning-bg-subtle, #fff3cd)',
        borderWidth: '2px',
      }}
    >
      <CCardHeader
        className="d-flex align-items-center justify-content-between py-2 px-3"
        style={{
          backgroundColor: 'var(--cui-warning, #ffc107)',
          color: 'var(--cui-dark, #212529)',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="d-flex align-items-center gap-2">
          <span className="fw-semibold">Proposed Changes</span>
          <CBadge color="dark" shape="rounded-pill">
            {pendingProposals.length}
          </CBadge>
          {highRiskCount > 0 && (
            <CBadge color="danger" shape="rounded-pill">
              <CIcon icon={cilWarning} size="sm" className="me-1" />
              {highRiskCount} high-risk
            </CBadge>
          )}
        </div>
        <div className="d-flex align-items-center gap-2">
          {batchId && pendingProposals.length > 1 && onConfirmAll && (
            <CButton
              color="success"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleConfirmAll();
              }}
              disabled={loadingId !== null}
            >
              {loadingId === 'batch' ? (
                <CSpinner size="sm" />
              ) : (
                <>Confirm All ({pendingProposals.length})</>
              )}
            </CButton>
          )}
          <CIcon icon={expanded ? cilChevronTop : cilChevronBottom} />
        </div>
      </CCardHeader>

      <CCollapse visible={expanded}>
        <CCardBody className="p-3">
          <div className="d-flex flex-column gap-2">
            {pendingProposals.map((proposal) => (
              <div
                key={proposal.mutationId}
                className="rounded p-3"
                style={{
                  backgroundColor: proposal.isHighRisk
                    ? 'var(--cui-danger-bg-subtle, #f8d7da)'
                    : 'var(--cui-body-bg, #fff)',
                  border: proposal.isHighRisk
                    ? '1px solid var(--cui-danger, #dc3545)'
                    : '1px solid var(--cui-border-color, #dee2e6)',
                }}
              >
                <div className="d-flex align-items-start justify-content-between gap-3">
                  <div className="flex-grow-1">
                    {/* Field name and table */}
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <span className="fw-semibold">
                        {formatFieldName(proposal.field)}
                      </span>
                      {proposal.isHighRisk && (
                        <CBadge color="danger" size="sm">
                          High Risk
                        </CBadge>
                      )}
                      <span
                        className="text-muted small"
                        style={{ fontSize: '0.75rem' }}
                      >
                        ({formatTableName(proposal.table)})
                      </span>
                    </div>

                    {/* Value change */}
                    <div className="small">
                      {proposal.currentValue !== null && (
                        <>
                          <span
                            className="text-decoration-line-through text-muted"
                          >
                            {formatValue(proposal.currentValue)}
                          </span>
                          <span className="mx-2 text-muted">→</span>
                        </>
                      )}
                      <span className="fw-medium text-success">
                        {formatValue(proposal.proposedValue)}
                      </span>
                    </div>

                    {/* Reason */}
                    {proposal.reason && (
                      <div
                        className="mt-1 small text-muted"
                        style={{ fontSize: '0.75rem' }}
                      >
                        {proposal.reason}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="d-flex gap-2 flex-shrink-0">
                    <CButton
                      color="success"
                      size="sm"
                      variant="outline"
                      onClick={() => handleConfirm(proposal.mutationId)}
                      disabled={loadingId !== null}
                    >
                      {loadingId === proposal.mutationId ? (
                        <CSpinner size="sm" />
                      ) : (
                        <>
                          <CIcon icon={cilCheckCircle} size="sm" className="me-1" />
                          Confirm
                        </>
                      )}
                    </CButton>
                    <CButton
                      color="secondary"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleReject(proposal.mutationId)}
                      disabled={loadingId !== null}
                    >
                      <CIcon icon={cilXCircle} size="sm" className="me-1" />
                      Reject
                    </CButton>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Expiration notice */}
          <div
            className="mt-3 pt-2 small text-muted text-center"
            style={{
              borderTop: '1px solid var(--cui-border-color, #dee2e6)',
              fontSize: '0.75rem',
            }}
          >
            {expiresInMinutes > 0 ? (
              <>These proposals expire in ~{expiresInMinutes} minutes if not confirmed.</>
            ) : (
              <>These proposals may have expired. Please refresh if needed.</>
            )}
          </div>
        </CCardBody>
      </CCollapse>
    </CCard>
  );
}

export default MutationProposalCard;
