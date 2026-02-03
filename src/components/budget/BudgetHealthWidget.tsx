// Budget Health Widget - Dashboard widget showing variance summary
// v1.1 · 2025-11-03 · Fixed number formatting per UI_STANDARDS v1.0

'use client';

import React, { useState } from 'react';
import { CCard, CCardBody, CCardHeader, CSpinner, CBadge } from '@coreui/react';
import { SemanticButton } from '@/components/ui/landscape';
import { useBudgetVariance } from '@/hooks/useBudgetVariance';
import { formatMoney } from '@/utils/formatters/number';

interface BudgetHealthWidgetProps {
  projectId: number;
  onViewDetails?: () => void;
}

export default function BudgetHealthWidget({
  projectId,
  onViewDetails,
}: BudgetHealthWidgetProps) {
  const [expanded, setExpanded] = useState(false);

  // Fetch variance data with 1% threshold (show all meaningful variances)
  const { data: varianceData, isLoading, error, refetch } = useBudgetVariance(projectId, 1, true);

  if (isLoading) {
    return (
      <CCard>
        <CCardBody className="text-center">
          <CSpinner size="sm" /> Loading budget health...
        </CCardBody>
      </CCard>
    );
  }

  if (error) {
    return (
      <CCard>
        <CCardBody>
          <div className="text-danger small">Failed to load budget health</div>
        </CCardBody>
      </CCard>
    );
  }

  if (!varianceData) {
    return null;
  }

  // Calculate health metrics
  const totalVariances = varianceData.variances.length;
  const unreconciledVariances = varianceData.variances.filter(v => !v.is_reconciled).length;
  const materialVariances = varianceData.variances.filter(
    v => v.variance_pct !== null && Math.abs(v.variance_pct) > 5
  ).length;
  const criticalVariances = varianceData.variances.filter(
    v => v.variance_pct !== null && Math.abs(v.variance_pct) > 10
  ).length;

  // Determine health status
  let healthStatus: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';
  let healthColor: string = 'success';
  let healthIcon: string = '✓';

  if (criticalVariances > 0) {
    healthStatus = 'poor';
    healthColor = 'danger';
    healthIcon = '🚨';
  } else if (materialVariances > 2) {
    healthStatus = 'fair';
    healthColor = 'warning';
    healthIcon = '⚠️';
  } else if (materialVariances > 0 || unreconciledVariances > 3) {
    healthStatus = 'good';
    healthColor = 'info';
    healthIcon = 'ℹ️';
  }

  // Calculate total absolute variance
  const totalVarianceAmount = varianceData.variances.reduce(
    (sum, v) => sum + Math.abs(v.variance_amount),
    0
  );

  return (
    <CCard>
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2">
          <span className="fw-semibold">Budget Health</span>
          <CBadge color={healthColor}>
            {healthIcon} {healthStatus.toUpperCase()}
          </CBadge>
        </div>
        <div className="d-flex gap-2">
          <SemanticButton intent="tertiary-action" variant="ghost" size="sm" onClick={() => refetch()} title="Refresh">
            🔄
          </SemanticButton>
          <SemanticButton
            intent="tertiary-action"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            title={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? '▼' : '▶'}
          </SemanticButton>
        </div>
      </CCardHeader>

      <CCardBody>
        {/* Summary Metrics */}
        <div className="row g-3 mb-3">
          <div className="col-6">
            <div className="text-muted small">Total Variances</div>
            <div className="fs-5 fw-bold tnum text-end">{totalVariances}</div>
          </div>
          <div className="col-6">
            <div className="text-muted small">Unreconciled</div>
            <div className="fs-5 fw-bold text-warning tnum text-end">{unreconciledVariances}</div>
          </div>
          <div className="col-6">
            <div className="text-muted small">Material (&gt;5%)</div>
            <div className="fs-5 fw-bold text-danger tnum text-end">{materialVariances}</div>
          </div>
          <div className="col-6">
            <div className="text-muted small">Total Amount</div>
            <div className="fs-6 fw-bold tnum text-end">
              {formatMoney(totalVarianceAmount)}
            </div>
          </div>
        </div>

        {/* Expanded Details */}
        {expanded && unreconciledVariances > 0 && (
          <>
            <hr className="my-3" />
            <div className="small mb-2 fw-semibold">Top Unreconciled Variances</div>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {varianceData.variances
                .filter(v => !v.is_reconciled)
                .sort((a, b) => Math.abs(b.variance_amount) - Math.abs(a.variance_amount))
                .slice(0, 5)
                .map((variance, index) => (
                  <div
                    key={`${variance.category_level}-${variance.category_id}`}
                    className="d-flex justify-content-between align-items-start mb-2 p-2 rounded"
                    style={{ backgroundColor: 'var(--cui-light)' }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="small fw-semibold text-truncate">
                        {variance.category_name}
                      </div>
                      <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                        L{variance.category_level}
                      </div>
                    </div>
                    <div className="text-end ms-2">
                      <div
                        className={`small fw-bold tnum ${
                          variance.variance_amount > 0 ? 'text-warning' : 'text-danger'
                        }`}
                      >
                        {variance.variance_amount > 0 ? '+' : ''}
                        {formatMoney(Math.abs(variance.variance_amount))}
                      </div>
                      {variance.variance_pct !== null && (
                        <div className="text-muted tnum" style={{ fontSize: '0.7rem' }}>
                          {Math.abs(variance.variance_pct).toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}

        {/* Action Buttons */}
        {unreconciledVariances > 0 && (
          <div className="mt-3">
            <SemanticButton intent="primary-action" size="sm" className="w-100" onClick={onViewDetails}>
              View & Reconcile Variances
            </SemanticButton>
          </div>
        )}

        {unreconciledVariances === 0 && (
          <div className="alert alert-success mb-0 mt-2">
            <div className="d-flex align-items-center gap-2">
              <span>✓</span>
              <div>
                <strong>All Good!</strong>
                <div className="small">
                  All variances are reconciled or within acceptable limits.
                </div>
              </div>
            </div>
          </div>
        )}
      </CCardBody>
    </CCard>
  );
}
