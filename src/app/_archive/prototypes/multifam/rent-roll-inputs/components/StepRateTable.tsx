'use client';

import React from 'react';

export interface StepRow {
  step: number;
  fromPeriod: number | null;
  rate: number | null;
  periods: number | null;
  thruPeriod: number | null;
}

interface StepRateTableProps {
  steps: StepRow[];
  onUpdateStep: (stepIndex: number, field: 'rate' | 'periods', value: number | null) => void;
  rateUnit?: string; // '%' or '/mo'
  readonly?: boolean;
}

export function StepRateTable({ steps, onUpdateStep, rateUnit = '%', readonly = false }: StepRateTableProps) {
  const [editingCell, setEditingCell] = React.useState<{ step: number; field: 'rate' | 'periods' } | null>(null);
  const [editValue, setEditValue] = React.useState<string>('');

  const handleStartEdit = (stepIndex: number, field: 'rate' | 'periods', currentValue: number | null) => {
    if (readonly) return;
    setEditingCell({ step: stepIndex, field });
    setEditValue(currentValue?.toString() || '');
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const handleSaveEdit = () => {
    if (!editingCell) return;

    // For rate field: only accept numbers, no 'E'
    // For periods field: accept numbers or 'E' (null)
    let numValue: number | null;

    if (editingCell.field === 'rate') {
      // Rate field: must be a number, cannot be empty or 'E'
      if (editValue === '' || editValue.toUpperCase() === 'E') {
        numValue = null;
      } else {
        numValue = parseFloat(editValue);
        if (isNaN(numValue) || numValue < 0) {
          // Invalid input, cancel
          setEditingCell(null);
          return;
        }
      }
    } else {
      // Periods field: can be number or 'E' (null)
      if (editValue === '' || editValue.toUpperCase() === 'E') {
        numValue = null;
      } else {
        numValue = parseFloat(editValue);
        if (isNaN(numValue) || numValue < 0) {
          // Invalid input, cancel
          setEditingCell(null);
          return;
        }
      }
    }

    onUpdateStep(editingCell.step, editingCell.field, numValue);
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    } else if (e.key === 'Tab') {
      // Let the tab navigate naturally, the button handler will catch it
      return;
    }
  };

  const handleButtonKeyDown = (e: React.KeyboardEvent, stepIndex: number, field: 'rate' | 'periods', currentValue: number | null) => {
    if (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ') {
      if (e.key === 'Tab') {
        e.preventDefault();
        // Enter edit mode and let it auto-focus
        handleStartEdit(stepIndex, field, currentValue);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleStartEdit(stepIndex, field, currentValue);
      }
    }
  };

  const formatRate = (rate: number | null, isEditing: boolean): string => {
    if (rate === null) return '';
    if (isEditing) return rate.toString();
    if (rateUnit === '/mo') {
      return `${rate}${rateUnit}`;
    }
    return `${rate.toFixed(1)}${rateUnit}`;
  };

  const formatPeriod = (period: number | null): string | number => {
    return period === null ? 'E' : period;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-900 sticky top-0">
          <tr className="border-b border-gray-700">
            <th className="text-center px-3 py-2 font-medium text-gray-300">Step</th>
            <th className="text-center px-3 py-2 font-medium text-gray-300">From<br/>Period</th>
            <th className="text-right px-3 py-2 font-medium text-gray-300">Rate</th>
            <th className="text-right px-3 py-2 font-medium text-gray-300">Periods</th>
            <th className="text-center px-3 py-2 font-medium text-gray-300">Thru<br/>Period</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((step, index) => {
            const isEditingRate = editingCell?.step === index && editingCell?.field === 'rate';
            const isEditingPeriods = editingCell?.step === index && editingCell?.field === 'periods';

            return (
              <tr key={step.step} className="border-b border-gray-700 hover:bg-gray-750">
                {/* Step Number */}
                <td className="text-center px-3 py-2 text-white font-medium">
                  {step.step}
                </td>

                {/* From Period (auto-calculated, read-only) */}
                <td className="text-center px-3 py-2 text-gray-300">
                  {formatPeriod(step.fromPeriod)}
                </td>

                {/* Rate (editable) */}
                <td className="text-right px-3 py-2">
                  {isEditingRate ? (
                    <input
                      type="text"
                      className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-right"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={handleSaveEdit}
                      onFocus={handleInputFocus}
                      autoFocus
                      placeholder="0.0"
                    />
                  ) : (
                    <button
                      onClick={() => handleStartEdit(index, 'rate', step.rate)}
                      onKeyDown={(e) => handleButtonKeyDown(e, index, 'rate', step.rate)}
                      className={`w-full text-right px-2 py-1 rounded transition-colors ${
                        readonly
                          ? 'cursor-default'
                          : 'hover:bg-gray-700'
                      } ${
                        step.rate === null
                          ? 'text-orange-400 font-semibold'
                          : rateUnit === '/mo'
                          ? 'text-orange-400'
                          : 'text-green-600'
                      }`}
                      disabled={readonly}
                    >
                      {formatRate(step.rate, false)}
                    </button>
                  )}
                </td>

                {/* Periods (editable) */}
                <td className="text-right px-3 py-2">
                  {isEditingPeriods ? (
                    <input
                      type="text"
                      className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-right"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={handleSaveEdit}
                      onFocus={handleInputFocus}
                      autoFocus
                      placeholder="E"
                    />
                  ) : (
                    <button
                      onClick={() => handleStartEdit(index, 'periods', step.periods)}
                      onKeyDown={(e) => handleButtonKeyDown(e, index, 'periods', step.periods)}
                      className={`w-full text-right px-2 py-1 rounded transition-colors ${
                        readonly
                          ? 'cursor-default'
                          : 'hover:bg-gray-700'
                      } ${
                        step.periods === null ? 'text-orange-400 font-semibold' : 'text-blue-400'
                      }`}
                      disabled={readonly}
                    >
                      {formatPeriod(step.periods)}
                    </button>
                  )}
                </td>

                {/* Thru Period (auto-calculated, read-only) */}
                <td className="text-center px-3 py-2 text-gray-300">
                  {formatPeriod(step.thruPeriod)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Legend */}
      <div className="mt-3 px-3 pb-3">
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>E = End of Analysis</span>
        </div>
      </div>
    </div>
  );
}
