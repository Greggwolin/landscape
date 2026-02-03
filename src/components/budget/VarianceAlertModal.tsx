// Variance Alert Modal - Smart notification for mode switches with material variances
// v1.1 · 2025-11-03 · Fixed number formatting per UI_STANDARDS v1.0

'use client';

import React from 'react';
import { CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter, CAlert } from '@coreui/react';
import type { CategoryVariance } from '@/hooks/useBudgetVariance';
import { formatMoney } from '@/utils/formatters/number';
import { SemanticButton } from '@/components/ui/landscape';

interface VarianceAlertModalProps {
  visible: boolean;
  onClose: () => void;
  variances: CategoryVariance[];
  onReconcile: () => void;
  onSwitchToStandard: () => void;
  onContinueAnyway: () => void;
}

export default function VarianceAlertModal({
  visible,
  onClose,
  variances,
  onReconcile,
  onSwitchToStandard,
  onContinueAnyway,
}: VarianceAlertModalProps) {
  // Filter to only show variances > 5%
  const materialVariances = variances.filter(
    v => v.variance_pct !== null && Math.abs(v.variance_pct) > 5
  );

  if (materialVariances.length === 0) {
    return null;
  }

  return (
    <CModal
      visible={visible}
      onClose={onClose}
      alignment="center"
      backdrop="static"
      size="lg"
    >
      <CModalHeader closeButton>
        <CModalTitle>
          <span className="text-warning">⚠️ Budget Variance Detected</span>
        </CModalTitle>
      </CModalHeader>

      <CModalBody>
        <CAlert color="warning" className="mb-3">
          <strong>Landscaper Notice:</strong> You're switching to Napkin mode, but there are material variances
          in your budget. Editing parent categories in Napkin mode may increase these variances.
        </CAlert>

        <p className="mb-3">
          The following categories have variances greater than 5%:
        </p>

        <div className="table-responsive mb-3">
          <table className="table table-sm table-hover">
            <thead>
              <tr>
                <th>Category</th>
                <th className="text-end">Parent Amount</th>
                <th className="text-end">Children Amount</th>
                <th className="text-end">Variance</th>
              </tr>
            </thead>
            <tbody>
              {materialVariances.map((variance) => (
                <tr key={`${variance.category_level}-${variance.category_id}`}>
                  <td>
                    <div className="d-flex flex-column">
                      <span className="fw-semibold">{variance.category_name}</span>
                      <small className="text-muted">{variance.category_breadcrumb}</small>
                    </div>
                  </td>
                  <td className="text-end tnum">
                    {formatMoney(variance.parent_amount)}
                  </td>
                  <td className="text-end tnum">
                    {formatMoney(variance.children_amount)}
                  </td>
                  <td className="text-end">
                    <span
                      className={
                        variance.variance_amount > 0
                          ? 'text-warning fw-semibold tnum'
                          : 'text-danger fw-semibold tnum'
                      }
                    >
                      {variance.variance_amount > 0 ? '+' : ''}
                      {formatMoney(Math.abs(variance.variance_amount))}
                      {variance.variance_pct !== null && (
                        <span className="ms-1 tnum">
                          ({Math.abs(variance.variance_pct).toFixed(1)}%)
                        </span>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="alert alert-info">
          <strong>💡 Recommendation:</strong>
          <ul className="mb-0 mt-2">
            <li>Use <strong>Standard or Detail mode</strong> to view and reconcile variances</li>
            <li>Click <strong>"Reconcile Now"</strong> to switch to Standard mode and resolve variances</li>
            <li>Or click <strong>"Continue Anyway"</strong> if you understand the implications</li>
          </ul>
        </div>
      </CModalBody>

      <CModalFooter>
        <SemanticButton intent="tertiary-action" onClick={onContinueAnyway}>
          Continue Anyway
        </SemanticButton>
        <SemanticButton intent="confirm-action" onClick={onSwitchToStandard}>
          Switch to Standard Mode
        </SemanticButton>
        <SemanticButton intent="confirm-action" onClick={onReconcile}>
          Reconcile Now
        </SemanticButton>
      </CModalFooter>
    </CModal>
  );
}
