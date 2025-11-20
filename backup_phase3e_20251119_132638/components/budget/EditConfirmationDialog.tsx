// Edit Confirmation Dialog - Smart guard for variance-creating edits
// v1.0 · 2025-11-03

'use client';

import React from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CAlert,
} from '@coreui/react';

interface EditConfirmationDialogProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  categoryName: string;
  categoryLevel: number;
  hasChildren: boolean;
  currentAmount: number;
  newAmount: number;
  childrenAmount?: number;
}

export default function EditConfirmationDialog({
  visible,
  onConfirm,
  onCancel,
  categoryName,
  categoryLevel,
  hasChildren,
  currentAmount,
  newAmount,
  childrenAmount,
}: EditConfirmationDialogProps) {
  const amountChange = newAmount - currentAmount;
  const willCreateVariance = hasChildren && childrenAmount !== undefined;
  const newVariance = willCreateVariance ? newAmount - childrenAmount : 0;
  const variancePct = childrenAmount ? (newVariance / childrenAmount) * 100 : 0;

  return (
    <CModal visible={visible} onClose={onCancel} alignment="center" backdrop="static">
      <CModalHeader closeButton>
        <CModalTitle>Confirm Category Edit</CModalTitle>
      </CModalHeader>

      <CModalBody>
        {willCreateVariance ? (
          <>
            <CAlert color="warning" className="mb-3">
              <strong>⚠️ Variance Warning</strong>
              <p className="mb-0 mt-2">
                You're editing a parent category that has child categories. This will create or
                modify a variance.
              </p>
            </CAlert>

            <div className="mb-3">
              <h6>{categoryName}</h6>
              <div className="text-muted small">Level {categoryLevel} Category</div>
            </div>

            <div className="table-responsive mb-3">
              <table className="table table-sm">
                <tbody>
                  <tr>
                    <td>Current Parent Amount:</td>
                    <td className="text-end fw-semibold">
                      ${currentAmount.toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td>New Parent Amount:</td>
                    <td className="text-end fw-semibold text-primary">
                      ${newAmount.toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td>Children Total:</td>
                    <td className="text-end fw-semibold">
                      ${(childrenAmount || 0).toLocaleString()}
                    </td>
                  </tr>
                  <tr className="border-top">
                    <td>
                      <strong>Resulting Variance:</strong>
                    </td>
                    <td
                      className={`text-end fw-bold ${
                        Math.abs(variancePct) > 5
                          ? 'text-danger'
                          : Math.abs(variancePct) > 1
                          ? 'text-warning'
                          : 'text-success'
                      }`}
                    >
                      {newVariance > 0 ? '+' : ''}
                      ${Math.abs(newVariance).toLocaleString()}
                      {variancePct !== 0 && (
                        <span className="small ms-1">
                          ({Math.abs(variancePct).toFixed(1)}%)
                        </span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="alert alert-info mb-0">
              <strong>💡 Recommendation:</strong>
              <ul className="mb-0 mt-2">
                <li>
                  If this is intentional, proceed and reconcile the variance later in Standard or
                  Detail mode
                </li>
                <li>
                  Or, edit the child categories instead to maintain alignment
                </li>
              </ul>
            </div>
          </>
        ) : (
          <>
            <div className="mb-3">
              <h6>{categoryName}</h6>
              <div className="text-muted small">Level {categoryLevel} Category</div>
            </div>

            <div className="table-responsive mb-3">
              <table className="table table-sm">
                <tbody>
                  <tr>
                    <td>Current Amount:</td>
                    <td className="text-end fw-semibold">
                      ${currentAmount.toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td>New Amount:</td>
                    <td className="text-end fw-semibold text-primary">
                      ${newAmount.toLocaleString()}
                    </td>
                  </tr>
                  <tr className="border-top">
                    <td>
                      <strong>Change:</strong>
                    </td>
                    <td
                      className={`text-end fw-bold ${
                        amountChange > 0 ? 'text-success' : 'text-danger'
                      }`}
                    >
                      {amountChange > 0 ? '+' : ''}
                      ${Math.abs(amountChange).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <CAlert color="info" className="mb-0">
              This category has no children, so this edit will not create a variance.
            </CAlert>
          </>
        )}
      </CModalBody>

      <CModalFooter>
        <CButton color="secondary" onClick={onCancel}>
          Cancel
        </CButton>
        <CButton
          color={willCreateVariance && Math.abs(variancePct) > 5 ? 'warning' : 'primary'}
          onClick={onConfirm}
        >
          {willCreateVariance ? 'Proceed with Edit' : 'Confirm Edit'}
        </CButton>
      </CModalFooter>
    </CModal>
  );
}
