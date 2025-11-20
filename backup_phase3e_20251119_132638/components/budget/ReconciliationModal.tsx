// Reconciliation Modal - UI for reconciling budget variances
// v1.1 · 2025-11-03 · Fixed number formatting per UI_STANDARDS v1.0

'use client';

import React, { useState } from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CAlert,
  CFormCheck,
  CFormTextarea,
  CSpinner,
} from '@coreui/react';
import type { CategoryVariance } from '@/hooks/useBudgetVariance';
import { formatMoney } from '@/utils/formatters/number';

interface ReconciliationModalProps {
  visible: boolean;
  onClose: () => void;
  variance: CategoryVariance | null;
  projectId: number;
  onReconciled: () => void;
}

type ReconciliationMethod = 'parent_to_children' | 'children_to_parent' | 'add_contingency';

interface ReconciliationResult {
  success: boolean;
  method: ReconciliationMethod;
  items_updated: number;
  variance_before: number;
  variance_after: number;
  audit_trail: Array<{
    fact_id: number;
    category_name: string;
    amount_before: number;
    amount_after: number;
    change: number;
  }>;
}

export default function ReconciliationModal({
  visible,
  onClose,
  variance,
  projectId,
  onReconciled,
}: ReconciliationModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<ReconciliationMethod>('parent_to_children');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReconciliationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleReconcile = async () => {
    if (!variance) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/budget/reconcile/${projectId}/category/${variance.category_id}/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            method: selectedMethod,
            notes: notes || undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reconcile variance');
      }

      const data: ReconciliationResult = await response.json();
      setResult(data);

      // Notify parent component to refresh data
      onReconciled();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reconcile variance');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setError(null);
    setNotes('');
    setSelectedMethod('parent_to_children');
    onClose();
  };

  if (!variance) {
    return null;
  }

  // If we have a result, show success screen
  if (result) {
    return (
      <CModal visible={visible} onClose={handleClose} alignment="center" size="lg">
        <CModalHeader closeButton>
          <CModalTitle>
            <span className="text-success">✓ Reconciliation Complete</span>
          </CModalTitle>
        </CModalHeader>

        <CModalBody>
          <CAlert color="success" className="mb-3">
            <strong>Success!</strong> Variance has been reconciled using the{' '}
            <strong>
              {result.method === 'parent_to_children'
                ? 'Parent to Children'
                : result.method === 'children_to_parent'
                ? 'Children to Parent'
                : 'Add Contingency'}
            </strong>{' '}
            method.
          </CAlert>

          <div className="row mb-3">
            <div className="col-md-4">
              <div className="text-muted small">Items Updated</div>
              <div className="fs-5 fw-bold tnum text-end">{result.items_updated}</div>
            </div>
            <div className="col-md-4">
              <div className="text-muted small">Variance Before</div>
              <div className="fs-5 fw-bold text-warning tnum text-end">
                {formatMoney(Math.abs(result.variance_before))}
              </div>
            </div>
            <div className="col-md-4">
              <div className="text-muted small">Variance After</div>
              <div className="fs-5 fw-bold text-success tnum text-end">
                {formatMoney(Math.abs(result.variance_after))}
              </div>
            </div>
          </div>

          {result.audit_trail.length > 0 && (
            <>
              <h6 className="mt-4 mb-3">Audit Trail</h6>
              <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <table className="table table-sm table-hover">
                  <thead className="sticky-top bg-white">
                    <tr>
                      <th>Item</th>
                      <th className="text-end">Before</th>
                      <th className="text-end">After</th>
                      <th className="text-end">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.audit_trail.map((entry) => (
                      <tr key={entry.fact_id}>
                        <td>
                          <small>{entry.category_name}</small>
                        </td>
                        <td className="text-end tnum">
                          <small>{formatMoney(entry.amount_before)}</small>
                        </td>
                        <td className="text-end tnum">
                          <small>{formatMoney(entry.amount_after)}</small>
                        </td>
                        <td className="text-end">
                          <small
                            className={`tnum ${entry.change > 0 ? 'text-success' : 'text-danger'}`}
                          >
                            {entry.change > 0 ? '+' : ''}
                            {formatMoney(Math.abs(entry.change))}
                          </small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CModalBody>

        <CModalFooter>
          <CButton color="primary" onClick={handleClose}>
            Done
          </CButton>
        </CModalFooter>
      </CModal>
    );
  }

  // Main reconciliation UI
  return (
    <CModal visible={visible} onClose={handleClose} alignment="center" size="lg" backdrop="static">
      <CModalHeader closeButton>
        <CModalTitle>Reconcile Budget Variance</CModalTitle>
      </CModalHeader>

      <CModalBody>
        {error && (
          <CAlert color="danger" dismissible onClose={() => setError(null)}>
            {error}
          </CAlert>
        )}

        <div className="mb-4">
          <h6>Category: {variance.category_name}</h6>
          <div className="text-muted small">{variance.category_breadcrumb}</div>
        </div>

        <div className="row mb-4">
          <div className="col-md-4">
            <div className="text-muted small">Parent Amount</div>
            <div className="fs-5 tnum text-end">{formatMoney(variance.parent_amount)}</div>
          </div>
          <div className="col-md-4">
            <div className="text-muted small">Children Amount</div>
            <div className="fs-5 tnum text-end">{formatMoney(variance.children_amount)}</div>
          </div>
          <div className="col-md-4">
            <div className="text-muted small">Variance</div>
            <div className="fs-5 fw-bold text-warning tnum text-end">
              {variance.variance_amount > 0 ? '+' : ''}
              {formatMoney(Math.abs(variance.variance_amount))}
              {variance.variance_pct !== null && (
                <span className="small ms-1">
                  ({Math.abs(variance.variance_pct).toFixed(1)}%)
                </span>
              )}
            </div>
          </div>
        </div>

        <h6 className="mb-3">Select Reconciliation Method</h6>

        <div className="mb-3">
          <CFormCheck
            type="radio"
            id="method-parent-to-children"
            name="reconciliation-method"
            value="parent_to_children"
            label={
              <div>
                <strong>Parent to Children (Distribute)</strong>
                <div className="text-muted small">
                  Distribute the parent amount proportionally to all child categories. This adjusts
                  children to match the parent total.
                </div>
              </div>
            }
            checked={selectedMethod === 'parent_to_children'}
            onChange={(e) => setSelectedMethod(e.target.value as ReconciliationMethod)}
          />
        </div>

        <div className="mb-3">
          <CFormCheck
            type="radio"
            id="method-children-to-parent"
            name="reconciliation-method"
            value="children_to_parent"
            label={
              <div>
                <strong>Children to Parent (Roll-up)</strong>
                <div className="text-muted small">
                  Update the parent category to match the sum of children. This adjusts parent items
                  proportionally to match children total.
                </div>
              </div>
            }
            checked={selectedMethod === 'children_to_parent'}
            onChange={(e) => setSelectedMethod(e.target.value as ReconciliationMethod)}
          />
        </div>

        <div className="mb-4">
          <CFormCheck
            type="radio"
            id="method-add-contingency"
            name="reconciliation-method"
            value="add_contingency"
            label={
              <div>
                <strong>Add Contingency Line Item</strong>
                <div className="text-muted small">
                  Create a new contingency line item in the parent category for the variance amount.
                  This preserves existing amounts and adds a reconciliation item.
                </div>
              </div>
            }
            checked={selectedMethod === 'add_contingency'}
            onChange={(e) => setSelectedMethod(e.target.value as ReconciliationMethod)}
          />
        </div>

        <div className="mb-3">
          <label htmlFor="reconciliation-notes" className="form-label">
            Notes (Optional)
          </label>
          <CFormTextarea
            id="reconciliation-notes"
            rows={3}
            placeholder="Add notes about why this reconciliation is being made..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <CAlert color="info" className="mb-0">
          <strong>💡 Tip:</strong> All changes will be tracked in the audit trail. You can review
          the changes before they are applied.
        </CAlert>
      </CModalBody>

      <CModalFooter>
        <CButton color="secondary" onClick={handleClose} disabled={loading}>
          Cancel
        </CButton>
        <CButton color="primary" onClick={handleReconcile} disabled={loading}>
          {loading ? (
            <>
              <CSpinner size="sm" className="me-2" />
              Reconciling...
            </>
          ) : (
            'Reconcile Now'
          )}
        </CButton>
      </CModalFooter>
    </CModal>
  );
}
