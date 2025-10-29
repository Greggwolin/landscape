'use client';

import React from 'react';
import { ComplexityTier } from '@/contexts/ComplexityModeContext';

interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  minTier: ComplexityTier;
  description?: string;
}

interface ConfigureColumnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnConfig[];
  onToggleColumn: (columnId: string) => void;
  currentMode: ComplexityTier;
}

export function ConfigureColumnsModal({
  isOpen,
  onClose,
  columns,
  onToggleColumn,
  currentMode
}: ConfigureColumnsModalProps) {
  if (!isOpen) return null;

  const tierOrder: Record<ComplexityTier, number> = { basic: 1, standard: 2, advanced: 3 };
  const currentTierLevel = tierOrder[currentMode];

  // Filter columns available in current mode
  const availableColumns = columns.filter(col => tierOrder[col.minTier] <= currentTierLevel);
  const lockedColumns = columns.filter(col => tierOrder[col.minTier] > currentTierLevel);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div
        className="rounded-lg p-6 max-w-2xl w-full mx-4 border"
        style={{
          backgroundColor: 'var(--cui-body-bg)',
          borderColor: 'var(--cui-border-color)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold" style={{ color: 'var(--cui-body-color)' }}>
            Configure Columns
          </h3>
          <button
            onClick={onClose}
            className="transition-colors"
            style={{ color: 'var(--cui-secondary-color)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--cui-body-color)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--cui-secondary-color)'}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm mb-4" style={{ color: 'var(--cui-secondary-color)' }}>
            Select which columns to display in the expense table. Some columns are only available in Standard or Advanced modes.
          </p>

          {/* Available Columns */}
          <div className="space-y-2 mb-6">
            <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--cui-body-color)' }}>
              Available in {currentMode} mode:
            </h4>
            {availableColumns.map(col => (
              <label
                key={col.id}
                className="flex items-start gap-3 p-3 rounded cursor-pointer transition-colors"
                style={{
                  backgroundColor: 'var(--cui-tertiary-bg)',
                  border: '1px solid var(--cui-border-color)'
                }}
              >
                <input
                  type="checkbox"
                  checked={col.visible}
                  onChange={() => onToggleColumn(col.id)}
                  className="mt-1 cursor-pointer"
                  style={{
                    width: '20px',
                    height: '20px',
                    accentColor: 'var(--cui-primary)',
                    cursor: 'pointer'
                  }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium" style={{ color: 'var(--cui-body-color)' }}>
                      {col.label}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: 'var(--cui-secondary-bg)',
                        color: 'var(--cui-secondary-color)'
                      }}
                    >
                      {col.minTier}
                    </span>
                  </div>
                  {col.description && (
                    <p className="text-xs mt-1" style={{ color: 'var(--cui-secondary-color)' }}>
                      {col.description}
                    </p>
                  )}
                </div>
              </label>
            ))}
          </div>

          {/* Locked Columns */}
          {lockedColumns.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--cui-secondary-color)' }}>
                Locked columns (upgrade to {lockedColumns[0].minTier} mode to access):
              </h4>
              {lockedColumns.map(col => (
                <div
                  key={col.id}
                  className="flex items-start gap-3 p-3 rounded opacity-50"
                  style={{
                    backgroundColor: 'var(--cui-tertiary-bg)',
                    border: '1px solid var(--cui-border-color)'
                  }}
                >
                  <input
                    type="checkbox"
                    disabled
                    className="mt-1 cursor-not-allowed"
                    style={{
                      width: '18px',
                      height: '18px'
                    }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium" style={{ color: 'var(--cui-secondary-color)' }}>
                        {col.label}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: 'var(--cui-secondary-bg)',
                          color: 'var(--cui-secondary-color)'
                        }}
                      >
                        {col.minTier}
                      </span>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        style={{ color: 'var(--cui-secondary-color)' }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    {col.description && (
                      <p className="text-xs mt-1" style={{ color: 'var(--cui-secondary-color)' }}>
                        {col.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className="flex justify-end gap-2 pt-4 border-t"
          style={{ borderColor: 'var(--cui-border-color)' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded transition-colors"
            style={{
              backgroundColor: 'var(--cui-primary)',
              color: 'white'
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
