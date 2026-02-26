'use client';

import React from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CFormCheck,
  CBadge,
} from '@coreui/react';

export interface BudgetColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  locked?: boolean; // Core columns that can't be hidden
  description?: string;
}

interface ColumnChooserProps {
  isOpen: boolean;
  onClose: () => void;
  columns: BudgetColumnConfig[];
  onToggleColumn: (columnId: string) => void;
}

export function ColumnChooser({
  isOpen,
  onClose,
  columns,
  onToggleColumn,
}: ColumnChooserProps) {
  const coreColumns = columns.filter(col => col.locked);
  const optionalColumns = columns.filter(col => !col.locked);

  return (
    <CModal visible={isOpen} onClose={onClose} size="lg">
      <CModalHeader>
        <CModalTitle>Configure Columns</CModalTitle>
      </CModalHeader>

      <CModalBody>
        <p className="text-medium-emphasis mb-4">
          Select which columns to display in the budget grid. Core columns are always visible.
        </p>

        {/* Core Columns (Always Visible) */}
        {coreColumns.length > 0 && (
          <div className="mb-4">
            <h6 className="text-medium-emphasis mb-3">Core Columns (always visible)</h6>
            {coreColumns.map(col => (
              <div
                key={col.id}
                className="d-flex align-items-start gap-2 p-2 mb-2 bg-light rounded border"
              >
                <CFormCheck
                  checked={true}
                  disabled
                  label=""
                  className="mt-1"
                />
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center gap-2">
                    <span className="fw-medium">{col.label}</span>
                    <CBadge color="info" shape="rounded-pill" size="sm">
                      Required
                    </CBadge>
                  </div>
                  {col.description && (
                    <small className="text-medium-emphasis d-block mt-1">
                      {col.description}
                    </small>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Optional Columns */}
        {optionalColumns.length > 0 && (
          <div>
            <h6 className="text-medium-emphasis mb-3">Optional Columns</h6>
            {optionalColumns.map(col => (
              <label
                key={col.id}
                className="d-flex align-items-start gap-2 p-2 mb-2 rounded border cursor-pointer"
                style={{ cursor: 'pointer' }}
              >
                <CFormCheck
                  checked={col.visible}
                  onChange={() => onToggleColumn(col.id)}
                  label=""
                  className="mt-1"
                />
                <div className="flex-grow-1">
                  <span className="fw-medium">{col.label}</span>
                  {col.description && (
                    <small className="text-medium-emphasis d-block mt-1">
                      {col.description}
                    </small>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}
      </CModalBody>

      <CModalFooter className="d-flex justify-content-between">
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => {
            optionalColumns.forEach(col => {
              if (!col.visible) {
                onToggleColumn(col.id);
              }
            });
          }}
        >
          Show All
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onClose}
        >
          Done
        </button>
      </CModalFooter>
    </CModal>
  );
}
