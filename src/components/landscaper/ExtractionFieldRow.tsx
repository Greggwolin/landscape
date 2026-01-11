'use client';

import React, { useState } from 'react';
import { CBadge, CFormInput } from '@coreui/react';
import {
  formatDisplayValue,
  isNumericField,
  isCalculatedField,
  computeCalculatedValue,
  getCalculatedFieldLabel,
} from './utils/formatDisplayValue';

interface ExtractionFieldRowProps {
  field: {
    extraction_id?: number;
    field_key: string;
    suggested_field: string;
    suggested_value: string;
    confidence: number;
    source_snippet?: string;
    source_text?: string;
    status?: 'pending' | 'accepted' | 'rejected' | 'conflict';
    conflict?: {
      existing_value: string;
      existing_doc_name?: string;
    };
  };
  extractionValues?: Record<string, number>;
  choice: 'accept' | 'edit' | 'skip' | 'keep_existing' | 'use_new' | 'enter_different';
  editedValue: string;
  onChoiceChange: (choice: 'accept' | 'edit' | 'skip' | 'keep_existing' | 'use_new' | 'enter_different') => void;
  onEditValueChange: (value: string) => void;
  showSource?: boolean;
}

export function ExtractionFieldRow({
  field,
  extractionValues = {},
  choice,
  editedValue,
  onChoiceChange,
  onEditValueChange,
  showSource = false,
}: ExtractionFieldRowProps) {
  const [showSourceExpanded, setShowSourceExpanded] = useState(false);
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [inlineEditValue, setInlineEditValue] = useState(field.suggested_value);

  const fieldKey = field.field_key || field.suggested_field;
  const isCalculated = isCalculatedField(fieldKey);
  const isNumeric = isNumericField(fieldKey);
  const sourceText = field.source_snippet || field.source_text || '';

  // ISSUE 1 FIX: Only show conflict UI if existing value is non-empty
  // Empty existing value is NOT a real conflict - it's a first-time extraction
  const isEmptyExistingValue = (val: string | undefined | null): boolean => {
    if (!val) return true;
    const normalized = val.trim().toLowerCase();
    return normalized === '' || normalized === 'null' || normalized === 'none' ||
           normalized === '(empty)' || normalized === 'n/a' || normalized === '-';
  };

  const hasConflict = field.status === 'conflict' &&
                      field.conflict?.existing_value &&
                      !isEmptyExistingValue(field.conflict.existing_value);

  // Calculate variance for calculated fields
  const calculatedValue = isCalculated
    ? computeCalculatedValue(fieldKey, extractionValues)
    : null;
  const extractedNum = parseFloat(String(field.suggested_value).replace(/[$,%,]/g, ''));
  const hasCalcVariance =
    isCalculated &&
    calculatedValue !== null &&
    !isNaN(extractedNum) &&
    Math.abs(extractedNum - calculatedValue) > 0.01 * Math.abs(extractedNum);

  const formatLabel = (key: string) => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .replace('Opex ', '')
      .replace(' Sf', ' SF')
      .replace(' Pct', ' %')
      .replace('Psf', 'PSF');
  };

  // Confidence color
  const getConfidenceColor = (conf: number): 'success' | 'warning' | 'danger' => {
    if (conf >= 0.8) return 'success';
    if (conf >= 0.5) return 'warning';
    return 'danger';
  };

  const handleInlineEditSave = () => {
    onEditValueChange(inlineEditValue);
    onChoiceChange('edit');
    setIsInlineEditing(false);
  };

  const handleInlineEditCancel = () => {
    setInlineEditValue(field.suggested_value);
    setIsInlineEditing(false);
  };

  const isAccepted = choice === 'accept' || choice === 'use_new';
  const isSkipped = choice === 'skip' || choice === 'keep_existing';

  return (
    <div
      className={`border-bottom ${hasConflict ? 'bg-warning-subtle' : hasCalcVariance ? 'bg-info-subtle' : ''}`}
      style={{
        borderColor: 'var(--cui-border-color)',
        opacity: isSkipped ? 0.5 : 1,
      }}
    >
      {/* Main row */}
      <div className="d-flex align-items-center py-2 px-3 gap-3">
        {/* Field label - fixed width */}
        <div className="flex-shrink-0" style={{ width: '180px' }}>
          <span className="small fw-medium text-body d-block text-truncate">
            {formatLabel(fieldKey)}
          </span>
          {isCalculated && (
            <span
              className="text-primary small ms-1"
              title={`Calculated: ${getCalculatedFieldLabel(fieldKey) || 'computed field'}`}
              style={{ cursor: 'help' }}
            >
              ƒ
            </span>
          )}
        </div>

        {/* Value - flex grow */}
        <div className={`flex-grow-1 min-w-0 ${isNumeric ? 'text-end' : 'text-start'}`}>
          {isInlineEditing ? (
            <CFormInput
              size="sm"
              type="text"
              value={inlineEditValue}
              onChange={(e) => setInlineEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleInlineEditSave();
                if (e.key === 'Escape') handleInlineEditCancel();
              }}
              onBlur={handleInlineEditSave}
              autoFocus
              className="font-monospace"
              style={{ maxWidth: '200px', marginLeft: isNumeric ? 'auto' : undefined }}
            />
          ) : choice === 'edit' || choice === 'enter_different' ? (
            <CFormInput
              size="sm"
              type="text"
              value={editedValue}
              onChange={(e) => onEditValueChange(e.target.value)}
              placeholder={field.suggested_value}
              className="font-monospace"
              style={{ maxWidth: '200px', marginLeft: isNumeric ? 'auto' : undefined }}
            />
          ) : (
            <span
              className="font-monospace small d-inline-block"
              onClick={() => {
                if (!hasConflict) {
                  setIsInlineEditing(true);
                }
              }}
              style={{ cursor: hasConflict ? 'default' : 'pointer' }}
              title={hasConflict ? undefined : 'Click to edit'}
            >
              {hasConflict && <span className="text-warning me-1">⚠</span>}
              {formatDisplayValue(field.suggested_value, fieldKey)}
              {isCalculated && calculatedValue !== null && (
                <span className="text-body-secondary ms-2" style={{ fontSize: '0.75em' }}>
                  (calc: {formatDisplayValue(calculatedValue, fieldKey)})
                </span>
              )}
            </span>
          )}
        </div>

        {/* Confidence badge */}
        <div className="flex-shrink-0 text-center" style={{ width: '50px' }}>
          <CBadge color={getConfidenceColor(field.confidence)} shape="rounded-pill" size="sm">
            {Math.round(field.confidence * 100)}%
          </CBadge>
        </div>

        {/* Status/Actions */}
        <div className="flex-shrink-0 d-flex align-items-center gap-1" style={{ width: '80px' }}>
          {hasConflict ? (
            // Conflict resolution buttons
            <>
              <button
                onClick={() => onChoiceChange('keep_existing')}
                className={`btn btn-sm ${choice === 'keep_existing' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                title="Keep Existing"
                style={{ padding: '2px 6px', fontSize: '0.7rem' }}
              >
                Keep
              </button>
              <button
                onClick={() => onChoiceChange('use_new')}
                className={`btn btn-sm ${choice === 'use_new' ? 'btn-primary' : 'btn-outline-primary'}`}
                title="Use New"
                style={{ padding: '2px 6px', fontSize: '0.7rem' }}
              >
                New
              </button>
            </>
          ) : isAccepted ? (
            <button
              onClick={() => onChoiceChange('skip')}
              className="btn btn-sm btn-success d-flex align-items-center justify-content-center"
              title="Accepted - click to skip"
              style={{ width: '28px', height: '28px', padding: 0 }}
            >
              ✓
            </button>
          ) : isSkipped ? (
            <button
              onClick={() => onChoiceChange('accept')}
              className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center"
              title="Skipped - click to accept"
              style={{ width: '28px', height: '28px', padding: 0 }}
            >
              ✗
            </button>
          ) : (
            <>
              <button
                onClick={() => onChoiceChange('accept')}
                className="btn btn-sm btn-outline-success d-flex align-items-center justify-content-center"
                title="Accept"
                style={{ width: '28px', height: '28px', padding: 0 }}
              >
                ✓
              </button>
              <button
                onClick={() => onChoiceChange('skip')}
                className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center"
                title="Skip"
                style={{ width: '28px', height: '28px', padding: 0 }}
              >
                ✗
              </button>
            </>
          )}
        </div>
      </div>

      {/* Conflict detail row */}
      {hasConflict && field.conflict && (
        <div
          className="px-3 pb-2 border-start border-2 border-warning"
          style={{ marginLeft: '180px', paddingLeft: '12px' }}
        >
          <div className="small text-body-secondary mb-1">
            Existing:{' '}
            <span className="font-monospace">
              {field.conflict.existing_value
                ? formatDisplayValue(field.conflict.existing_value, fieldKey)
                : '(empty)'}
            </span>
            {field.conflict.existing_doc_name && (
              <span className="ms-2 text-muted">from {field.conflict.existing_doc_name}</span>
            )}
          </div>
          {choice === 'enter_different' && (
            <CFormInput
              size="sm"
              type="text"
              value={editedValue}
              onChange={(e) => onEditValueChange(e.target.value)}
              placeholder="Enter custom value"
              className="font-monospace mt-1"
              style={{ maxWidth: '200px' }}
            />
          )}
          <button
            onClick={() => {
              onEditValueChange(field.suggested_value);
              onChoiceChange('enter_different');
            }}
            className={`btn btn-sm mt-1 ${choice === 'enter_different' ? 'btn-info' : 'btn-outline-info'}`}
            style={{ padding: '2px 8px', fontSize: '0.7rem' }}
          >
            Enter Different
          </button>
        </div>
      )}

      {/* Source snippet (expandable) - only show when showSource is true */}
      {showSource && sourceText && (
        <div
          className="px-3 pb-2 small text-body-secondary"
          onClick={() => setShowSourceExpanded(!showSourceExpanded)}
          style={{ cursor: 'pointer', marginLeft: '180px' }}
        >
          {showSourceExpanded ? (
            <span>Source: &quot;{sourceText}&quot;</span>
          ) : (
            <span>
              Source: &quot;{sourceText.length > 50 ? sourceText.substring(0, 50) + '...' : sourceText}&quot;
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default ExtractionFieldRow;
