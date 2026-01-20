'use client';

import React from 'react';
import { CCardHeader } from '@coreui/react';

interface OperationsHeaderProps {
  projectName: string;
  unitCount: number;
  totalSF: number;
  isSaving?: boolean;
  isDirty?: boolean;
  onSave?: () => void;
}

/**
 * OperationsHeader - Header bar for Operations tab
 *
 * Shows project name, property pills (units, SF), and save indicator.
 * Value-Add toggle is now integrated into the ValueAddCard component.
 */
export function OperationsHeader({
  projectName,
  unitCount,
  totalSF,
  isSaving = false,
  isDirty = false,
  onSave
}: OperationsHeaderProps) {
  return (
    <CCardHeader className="ops-header d-flex justify-content-between align-items-center">
      <span className="fw-semibold">Operations · {projectName}</span>
      <div className="ops-header-right">
        <div className="ops-header-pills">
          <span className="ops-pill">
            Units: <b>{unitCount.toLocaleString()}</b>
          </span>
          <span className="ops-pill">
            SF: <b>{totalSF.toLocaleString()}</b>
          </span>
        </div>
        {isDirty && (
          <button
            className="ops-save-button"
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        )}
      </div>
    </CCardHeader>
  );
}

export default OperationsHeader;
