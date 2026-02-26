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
  children?: React.ReactNode;
}

/**
 * OperationsHeader - Header bar for Operations tab
 *
 * Shows project name, Value-Add toggle, property pills (units, SF), and save indicator.
 */
export function OperationsHeader({
  projectName,
  unitCount,
  totalSF,
  isSaving = false,
  isDirty = false,
  onSave,
  children
}: OperationsHeaderProps) {
  return (
    <CCardHeader className="ops-header d-flex justify-content-between align-items-center">
      <span className="fw-semibold">Operating Statement · {projectName}</span>
      <div className="ops-header-right">
        <div className="ops-header-pills">
          {children}
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
