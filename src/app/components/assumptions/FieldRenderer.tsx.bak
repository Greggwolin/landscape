'use client';

import { useEffect, useState, useRef } from 'react';
import { FieldDefinition, ComplexityTier } from '@/types/assumptions';
import { HelpTooltip } from './HelpTooltip';

interface FieldRendererProps {
  field: FieldDefinition;
  value: any;
  currentMode: ComplexityTier;
  onChange: (value: any) => void;
  allValues: Record<string, any>;
}

export function FieldRenderer({
  field,
  value,
  currentMode,
  onChange,
  allValues
}: FieldRendererProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const lastCalculatedValue = useRef<any>(null);

  // Sync display value with incoming value for non-auto-calc fields
  useEffect(() => {
    if (!field.autoCalc) {
      setDisplayValue(value);
    }
  }, [value, field.autoCalc]);

  // Handle auto-calculated fields
  useEffect(() => {
    if (field.autoCalc && field.dependsOn) {
      const hasAllDependencies = field.dependsOn.every(dep => allValues[dep] !== null && allValues[dep] !== undefined);
      if (hasAllDependencies) {
        const calculatedValue = field.autoCalc(allValues);
        // Only update if the calculated value is different from the last one
        if (calculatedValue !== null && calculatedValue !== undefined && calculatedValue !== lastCalculatedValue.current) {
          lastCalculatedValue.current = calculatedValue;
          setDisplayValue(calculatedValue);
          onChange(calculatedValue);
        }
      }
    }
    // Intentionally exclude onChange from dependencies to prevent infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.autoCalc, field.dependsOn, allValues]);

  // Determine if field is read-only (auto-calculated)
  const isReadOnly = field.autoCalc !== undefined;

  // Determine if field is required
  const isRequired = typeof field.required === 'boolean'
    ? field.required
    : field.required === currentMode;

  // Format number with thousand separators
  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined || num === '') return '';
    const numValue = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(numValue)) return '';

    // For whole numbers, use comma formatting
    if (Number.isInteger(numValue)) {
      return numValue.toLocaleString('en-US');
    }
    // For decimals, format with appropriate precision
    return numValue.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  };

  // Parse formatted number back to raw value
  const parseFormattedNumber = (str: string): number | null => {
    if (!str) return null;
    const cleaned = str.replace(/,/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  };

  // Determine field width class based on field type and expected size
  const getFieldWidthClass = (): string => {
    if (field.type === 'text') return 'field-full';
    if (field.type === 'date') return 'field-md';
    if (field.type === 'percentage') return 'field-sm';
    if (field.type === 'currency') return 'field-lg';
    if (field.type === 'number') {
      // Intelligent sizing based on validation or field name
      if (field.validation?.max && field.validation.max <= 100) return 'field-xs';
      if (field.validation?.max && field.validation.max <= 10000) return 'field-sm';
      return 'field-md';
    }
    return 'field-md';
  };

  // Render input based on field type
  const renderInput = () => {
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            className="form-control"
            value={displayValue || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={isReadOnly}
            required={isRequired}
          />
        );

      case 'number':
        return (
          <input
            type="text"
            className="form-control"
            value={displayValue !== null && displayValue !== undefined ? formatNumber(displayValue) : ''}
            onChange={(e) => onChange(parseFormattedNumber(e.target.value))}
            disabled={isReadOnly}
            required={isRequired}
          />
        );

      case 'currency':
        return (
          <div className="input-group">
            {field.format?.prefix && (
              <span className="input-addon">{field.format.prefix}</span>
            )}
            <input
              type="text"
              className="form-control"
              value={displayValue !== null && displayValue !== undefined ? formatNumber(displayValue) : ''}
              onChange={(e) => onChange(parseFormattedNumber(e.target.value))}
              disabled={isReadOnly}
              required={isRequired}
            />
          </div>
        );

      case 'percentage':
        return (
          <div className="input-group">
            <input
              type="text"
              className="form-control"
              value={displayValue !== null && displayValue !== undefined ? displayValue : ''}
              onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)}
              disabled={isReadOnly}
              required={isRequired}
            />
            {field.format?.suffix && (
              <span className="input-addon">{field.format.suffix}</span>
            )}
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            className="form-control"
            value={displayValue || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={isReadOnly}
            required={isRequired}
          />
        );

      case 'dropdown':
        return (
          <select
            className="form-control"
            value={displayValue || ''}
            onChange={(e) => onChange(e.target.value)}
            required={isRequired}
          >
            <option value="">Select...</option>
            {field.options?.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'toggle':
        return (
          <div className="toggle-group">
            <div
              className={`toggle-switch ${displayValue ? 'active' : ''}`}
              onClick={() => onChange(!displayValue)}
            >
              <span className="toggle-slider"></span>
            </div>
            <span className="toggle-label">{displayValue ? 'Yes' : 'No'}</span>
          </div>
        );

      default:
        return (
          <input
            type="text"
            className="form-control"
            value={displayValue || ''}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  };

  return (
    <div className={`form-group ${getFieldWidthClass()}`}>
      <label className="form-label">
        {field.label}
        {isRequired && <span className="text-red-500 ml-1">*</span>}
        <HelpTooltip field={field} currentMode={currentMode} />
      </label>
      {renderInput()}
      {isReadOnly && (
        <span className="field-hint">Auto-calculated</span>
      )}
    </div>
  );
}
