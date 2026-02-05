/**
 * AdditionalDataFoundPanel
 *
 * Displays proposed dynamic columns from Landscaper extraction.
 * Allows users to accept or reject proposed columns.
 */

'use client';

import React, { useState } from 'react';
import {
  CAlert,
  CButton,
  CFormCheck,
  CBadge,
  CSpinner,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPlus, cilInfo, cilFolder } from '@coreui/icons';
import { useProposedColumns, DynamicColumnDataType } from '@/hooks/useDynamicColumns';

interface AdditionalDataFoundPanelProps {
  projectId: number;
  tableName: string;
  documentName?: string;
  onColumnsChanged?: () => void;
}

const DATA_TYPE_LABELS: Record<DynamicColumnDataType, string> = {
  text: 'Text',
  number: 'Number',
  currency: 'Currency',
  percent: 'Percent',
  boolean: 'Yes/No',
  date: 'Date',
};

const DATA_TYPE_COLORS: Record<DynamicColumnDataType, string> = {
  text: 'secondary',
  number: 'info',
  currency: 'success',
  percent: 'warning',
  boolean: 'primary',
  date: 'dark',
};

export const AdditionalDataFoundPanel: React.FC<AdditionalDataFoundPanelProps> = ({
  projectId,
  tableName,
  documentName,
  onColumnsChanged,
}) => {
  const {
    proposedColumns,
    isLoading,
    acceptMultiple,
    rejectAll,
  } = useProposedColumns(projectId, tableName);

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  // Don't render if loading or no proposed columns
  if (isLoading || proposedColumns.length === 0) {
    return null;
  }

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(proposedColumns.map((col) => col.id)));
  };

  const selectNone = () => {
    setSelected(new Set());
  };

  const handleAcceptSelected = async () => {
    if (selected.size === 0) return;
    setIsProcessing(true);
    try {
      await acceptMultiple(Array.from(selected));
      setSelected(new Set());
      onColumnsChanged?.();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectAll = async () => {
    setIsProcessing(true);
    try {
      await rejectAll();
      onColumnsChanged?.();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <CAlert color="info" className="mb-3">
      <div className="d-flex align-items-start gap-2">
        <CIcon icon={cilInfo} size="lg" className="flex-shrink-0 mt-1" />
        <div className="flex-grow-1">
          <div className="d-flex align-items-center gap-2 mb-1">
            <strong>Additional Data Found</strong>
            {documentName && (
              <span className="text-body-secondary small">
                from {documentName}
              </span>
            )}
          </div>

          <p className="mb-2 small text-body-secondary">
            This extraction contains data that does not map to existing fields.
            Select which columns to add to your rent roll:
          </p>

          {/* Select all/none controls */}
          <div className="mb-2 d-flex gap-2">
            <button
              type="button"
              className="btn btn-link btn-sm p-0 text-decoration-none"
              onClick={selectAll}
            >
              Select All
            </button>
            <span className="text-body-secondary">|</span>
            <button
              type="button"
              className="btn btn-link btn-sm p-0 text-decoration-none"
              onClick={selectNone}
            >
              Select None
            </button>
          </div>

          {/* Proposed columns list */}
          <div className="d-flex flex-column gap-2 mb-3">
            {proposedColumns.map((col) => (
              <div
                key={col.id}
                className={`d-flex align-items-center gap-2 p-2 rounded border ${
                  selected.has(col.id)
                    ? 'border-primary bg-primary bg-opacity-10'
                    : 'border-secondary-subtle bg-body'
                }`}
                onClick={() => toggleSelect(col.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleSelect(col.id);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <CFormCheck
                  checked={selected.has(col.id)}
                  onChange={() => toggleSelect(col.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex-grow-1">
                  <span className="fw-medium">{col.display_label}</span>
                  <CBadge
                    color={DATA_TYPE_COLORS[col.data_type] || 'secondary'}
                    className="ms-2"
                    style={{ fontSize: '0.7rem' }}
                  >
                    {DATA_TYPE_LABELS[col.data_type] || col.data_type}
                  </CBadge>
                </div>
                <span className="text-body-secondary small">
                  {col.column_key}
                </span>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="d-flex gap-2">
            <CButton
              color="primary"
              size="sm"
              disabled={selected.size === 0 || isProcessing}
              onClick={handleAcceptSelected}
            >
              {isProcessing ? (
                <>
                  <CSpinner size="sm" className="me-1" />
                  Processing...
                </>
              ) : (
                <>
                  <CIcon icon={cilPlus} className="me-1" />
                  Add {selected.size > 0 ? `${selected.size} ` : ''}Selected as Columns
                </>
              )}
            </CButton>
            <CButton
              color="secondary"
              variant="ghost"
              size="sm"
              disabled={isProcessing}
              onClick={handleRejectAll}
            >
              <CIcon icon={cilFolder} className="me-1" />
              Save to Knowledge Only
            </CButton>
          </div>
        </div>
      </div>
    </CAlert>
  );
};

export default AdditionalDataFoundPanel;
