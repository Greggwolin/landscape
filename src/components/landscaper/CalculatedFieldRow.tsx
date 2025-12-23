'use client';

import React from 'react';
import { CBadge, CFormCheck } from '@coreui/react';
import {
  formatDisplayValue,
  computeCalculatedValue,
  getCalculatedFieldLabel,
  isNumericField,
} from './utils/formatDisplayValue';

interface CalculatedFieldRowProps {
  fieldKey: string;
  extractedValue: number | string;
  confidence: number;
  allExtractions: Record<string, number>;
  choice: 'accept' | 'edit' | 'skip';
  onChoiceChange: (choice: 'accept' | 'edit' | 'skip') => void;
  sourceText?: string;
}

export function CalculatedFieldRow({
  fieldKey,
  extractedValue,
  confidence,
  allExtractions,
  choice,
  onChoiceChange,
  sourceText,
}: CalculatedFieldRowProps) {
  const numericValue = typeof extractedValue === 'string' ? parseFloat(extractedValue) : extractedValue;
  const calculatedValue = computeCalculatedValue(fieldKey, allExtractions);
  const formulaLabel = getCalculatedFieldLabel(fieldKey);

  // Calculate variance (allow 1% tolerance)
  const hasVariance =
    calculatedValue !== null &&
    !isNaN(numericValue) &&
    Math.abs(numericValue - calculatedValue) > 0.01 * Math.abs(numericValue);

  const variance = calculatedValue !== null ? numericValue - calculatedValue : 0;

  const fieldLabel = fieldKey
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());

  const getConfidenceColor = (conf: number): 'success' | 'warning' | 'danger' => {
    if (conf >= 0.8) return 'success';
    if (conf >= 0.5) return 'warning';
    return 'danger';
  };

  return (
    <div
      className="p-3 rounded border"
      style={{
        borderColor: hasVariance ? 'var(--cui-warning)' : 'var(--cui-border-color)',
        backgroundColor: hasVariance
          ? 'var(--cui-warning-bg-subtle)'
          : choice === 'skip'
          ? 'var(--cui-tertiary-bg)'
          : 'transparent',
        opacity: choice === 'skip' ? 0.6 : 1,
      }}
    >
      {/* Header row */}
      <div className="d-flex justify-content-between align-items-start mb-2">
        <div>
          <div className="d-flex align-items-center gap-2">
            <span className="fw-medium">{fieldLabel}</span>
            <span
              className="text-primary small"
              title={formulaLabel ? `Calculated: ${formulaLabel}` : 'Calculated field'}
              style={{ cursor: 'help' }}
            >
              f
            </span>
            {hasVariance && (
              <CBadge color="warning" size="sm">
                Variance
              </CBadge>
            )}
          </div>
          {sourceText && (
            <div className="text-body-secondary small">
              Source: &quot;{sourceText.length > 60 ? sourceText.substring(0, 60) + '...' : sourceText}&quot;
            </div>
          )}
        </div>
        <CBadge color={getConfidenceColor(confidence)}>{Math.round(confidence * 100)}%</CBadge>
      </div>

      {/* Value display */}
      <div className="mb-2 p-2 rounded" style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
        <div className={`d-flex align-items-center gap-2 ${isNumericField(fieldKey) ? 'justify-content-end' : ''}`}>
          {hasVariance && <span style={{ color: 'var(--cui-warning)' }}>!</span>}
          <span className="fw-semibold font-monospace">
            {formatDisplayValue(extractedValue, fieldKey)}
          </span>
          {calculatedValue !== null && (
            <span className="text-body-secondary small">
              (calc: {formatDisplayValue(calculatedValue, fieldKey)})
            </span>
          )}
        </div>
        {hasVariance && (
          <div className="text-warning small mt-1 text-end">
            {formatDisplayValue(Math.abs(variance), fieldKey)} variance from calculated
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="d-flex align-items-center gap-3">
        <CFormCheck
          type="radio"
          name={`field-calc-${fieldKey}`}
          id={`accept-calc-${fieldKey}`}
          label="Accept"
          checked={choice === 'accept'}
          onChange={() => onChoiceChange('accept')}
        />
        <CFormCheck
          type="radio"
          name={`field-calc-${fieldKey}`}
          id={`edit-calc-${fieldKey}`}
          label="Edit"
          checked={choice === 'edit'}
          onChange={() => onChoiceChange('edit')}
        />
        <CFormCheck
          type="radio"
          name={`field-calc-${fieldKey}`}
          id={`skip-calc-${fieldKey}`}
          label="Skip"
          checked={choice === 'skip'}
          onChange={() => onChoiceChange('skip')}
        />
      </div>
    </div>
  );
}

export default CalculatedFieldRow;
