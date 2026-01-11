'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

export type InputCellVariant = 'as-is' | 'post-reno';
export type InputCellFormat = 'currency' | 'percent' | 'number';

interface InputCellProps {
  value: number | null | undefined;
  variant: InputCellVariant;
  format?: InputCellFormat;
  onChange?: (value: number | null) => void;
  onBlur?: (value: number | null) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  minWidth?: number;
}

/**
 * InputCell - Editable input cell for Operations P&L
 *
 * Two variants:
 * - 'as-is': Blue-bordered for current/As-Is values
 * - 'post-reno': Green-bordered for Post-Renovation values
 *
 * Formats:
 * - 'currency': Displays with $ prefix, formats with commas
 * - 'percent': Displays with % suffix, stores as decimal (0.03 = 3%)
 * - 'number': Plain number display
 */
export function InputCell({
  value,
  variant,
  format = 'currency',
  onChange,
  onBlur,
  disabled = false,
  placeholder = '—',
  className = '',
  minWidth = 65
}: InputCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Format value for display
  const formatDisplayValue = useCallback((val: number | null | undefined): string => {
    if (val === null || val === undefined) return '';

    switch (format) {
      case 'currency':
        return val.toLocaleString('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        });
      case 'percent':
        // Convert decimal to percentage for display (0.03 -> 3.0)
        return (val * 100).toFixed(1);
      case 'number':
        return val.toLocaleString('en-US');
      default:
        return String(val);
    }
  }, [format]);

  // Format value for edit input
  const formatEditValue = useCallback((val: number | null | undefined): string => {
    if (val === null || val === undefined) return '';

    switch (format) {
      case 'percent':
        return (val * 100).toString();
      default:
        return val.toString();
    }
  }, [format]);

  // Parse edited value back to number
  const parseValue = useCallback((str: string): number | null => {
    const cleaned = str.replace(/[,$%\s]/g, '');
    if (cleaned === '' || cleaned === '-') return null;

    const num = parseFloat(cleaned);
    if (isNaN(num)) return null;

    switch (format) {
      case 'percent':
        return num / 100; // Convert back to decimal
      default:
        return num;
    }
  }, [format]);

  // Handle click to start editing
  const handleClick = () => {
    if (disabled) return;
    setIsEditing(true);
    setEditValue(formatEditValue(value));
  };

  // Handle blur to save
  const handleBlur = () => {
    setIsEditing(false);
    const newValue = parseValue(editValue);
    if (onBlur) {
      onBlur(newValue);
    } else if (onChange) {
      onChange(newValue);
    }
  };

  // Handle enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setEditValue(formatEditValue(value));
      setIsEditing(false);
    }
  };

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const variantClass = variant === 'as-is'
    ? 'ops-input ops-input-as-is'
    : 'ops-input ops-input-post-reno';

  const prefix = format === 'currency' ? '$' : '';
  const suffix = format === 'percent' ? '%' : '';

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`${variantClass} ${className}`}
        style={{ minWidth }}
        disabled={disabled}
      />
    );
  }

  const displayValue = formatDisplayValue(value);
  const isEmpty = value === null || value === undefined;

  return (
    <span
      onClick={handleClick}
      className={`${variantClass} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}`}
      style={{ minWidth }}
      role="textbox"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
    >
      {isEmpty ? placeholder : `${prefix}${displayValue}${suffix}`}
    </span>
  );
}

export default InputCell;
