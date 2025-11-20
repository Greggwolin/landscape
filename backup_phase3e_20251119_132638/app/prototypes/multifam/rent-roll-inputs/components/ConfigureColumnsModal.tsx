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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">Configure Columns</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-300 mb-4">
            Select which columns to display in the expense table. Some columns are only available in Standard or Advanced modes.
          </p>

          {/* Available Columns */}
          <div className="space-y-2 mb-6">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Available in {currentMode} mode:</h4>
            {availableColumns.map(col => (
              <label
                key={col.id}
                className="flex items-start gap-3 p-3 bg-gray-900 rounded hover:bg-gray-850 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={col.visible}
                  onChange={() => onToggleColumn(col.id)}
                  className="mt-1 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{col.label}</span>
                    <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded">
                      {col.minTier}
                    </span>
                  </div>
                  {col.description && (
                    <p className="text-xs text-gray-400 mt-1">{col.description}</p>
                  )}
                </div>
              </label>
            ))}
          </div>

          {/* Locked Columns */}
          {lockedColumns.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-400 mb-2">
                Locked columns (upgrade to {lockedColumns[0].minTier} mode to access):
              </h4>
              {lockedColumns.map(col => (
                <div
                  key={col.id}
                  className="flex items-start gap-3 p-3 bg-gray-900/50 rounded opacity-50"
                >
                  <input
                    type="checkbox"
                    disabled
                    className="mt-1 w-4 h-4 text-gray-600 bg-gray-800 border-gray-700 rounded cursor-not-allowed"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 font-medium">{col.label}</span>
                      <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-400 rounded">
                        {col.minTier}
                      </span>
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    {col.description && (
                      <p className="text-xs text-gray-500 mt-1">{col.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
