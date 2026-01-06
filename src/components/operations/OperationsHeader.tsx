'use client';

import React from 'react';
import { ValueAddToggle } from './ValueAddToggle';

interface OperationsHeaderProps {
  projectName: string;
  unitCount: number;
  totalSF: number;
  valueAddEnabled: boolean;
  onToggleValueAdd: () => void;
  isSaving?: boolean;
  isDirty?: boolean;
  onSave?: () => void;
}

/**
 * OperationsHeader - Header bar for Operations tab
 *
 * Shows project name, property pills (units, SF),
 * Value-Add toggle, and save indicator.
 */
export function OperationsHeader({
  projectName,
  unitCount,
  totalSF,
  valueAddEnabled,
  onToggleValueAdd,
  isSaving = false,
  isDirty = false,
  onSave
}: OperationsHeaderProps) {
  return (
    <header className="ops-header">
      <div className="ops-header-left">
        <h1 className="ops-header-title">Operations · {projectName}</h1>
        <div className="ops-header-pills">
          <span className="ops-pill">
            Units: <b>{unitCount.toLocaleString()}</b>
          </span>
          <span className="ops-pill">
            SF: <b>{totalSF.toLocaleString()}</b>
          </span>
        </div>
      </div>
      <div className="ops-header-right">
        {isDirty && (
          <button
            className="ops-save-button"
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        )}
        <ValueAddToggle
          enabled={valueAddEnabled}
          onChange={() => onToggleValueAdd()}
        />
      </div>
    </header>
  );
}

export default OperationsHeader;
