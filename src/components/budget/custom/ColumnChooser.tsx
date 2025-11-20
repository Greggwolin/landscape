'use client';

import React from 'react';

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
  if (!isOpen) return null;

  const coreColumns = columns.filter(col => col.locked);
  const optionalColumns = columns.filter(col => !col.locked);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-6 max-w-2xl w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Configure Columns
          </h3>
          <button
            onClick={onClose}
            className="btn btn-sm btn-ghost-secondary"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          Select which columns to display in the budget grid. Core columns are always visible.
        </p>

        <div className="max-h-[500px] overflow-y-auto">
          {/* Core Columns (Always Visible) */}
          {coreColumns.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Core Columns (always visible)
              </h4>
              <div className="space-y-2">
                {coreColumns.map(col => (
                  <div
                    key={col.id}
                    className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={true}
                      disabled
                      className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded cursor-not-allowed"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-700 dark:text-gray-300 font-medium">
                          {col.label}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                          Required
                        </span>
                      </div>
                      {col.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {col.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optional Columns */}
          {optionalColumns.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Optional Columns
              </h4>
              <div className="space-y-2">
                {optionalColumns.map(col => (
                  <label
                    key={col.id}
                    className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-850 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={col.visible}
                      onChange={() => onToggleColumn(col.id)}
                      className="mt-1 w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900 dark:text-white font-medium">
                          {col.label}
                        </span>
                      </div>
                      {col.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {col.description}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center gap-2 pt-4 mt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              // Reset to default (show all optional columns)
              optionalColumns.forEach(col => {
                if (!col.visible) {
                  onToggleColumn(col.id);
                }
              });
            }}
            className="btn btn-secondary"
          >
            Show All
          </button>
          <button
            onClick={onClose}
            className="btn btn-primary"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
