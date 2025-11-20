'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface InlineEditableCellProps {
  value: string | number | null;
  fieldName: string;
  recordId: number;
  type?: 'text' | 'number' | 'date';
  align?: 'left' | 'center' | 'right';
  formatter?: (value: any) => string;
  onSave: (recordId: number, fieldName: string, value: any) => Promise<boolean>;
  className?: string;
}

export default function InlineEditableCell({
  value,
  fieldName,
  recordId,
  type = 'text',
  align = 'left',
  formatter,
  onSave,
  className = ''
}: InlineEditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>('');
  const [originalValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Convert value to string for input
  const valueToString = (val: string | number | null): string => {
    if (val === null || val === undefined) return '';
    if (type === 'number' && typeof val === 'number') return String(val);
    return String(val);
  };

  // Format display value
  const displayValue = formatter && value !== null ? formatter(value) : (value ?? '—');

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = () => {
    if (!isEditing) {
      setEditValue(valueToString(value));
      setIsEditing(true);
      setError(null);
    }
  };

  const handleSave = useCallback(async () => {
    const currentEditValue = editValue;
    const currentOriginalValue = valueToString(originalValue);

    // Don't save if value hasn't changed
    if (currentEditValue === currentOriginalValue) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Convert to appropriate type
      let valueToSave: any = currentEditValue;

      if (type === 'number') {
        if (currentEditValue === '') {
          valueToSave = null;
        } else {
          const parsed = parseFloat(currentEditValue);
          if (isNaN(parsed)) {
            setError('Invalid number');
            setIsSaving(false);
            return;
          }
          valueToSave = parsed;
        }
      } else if (currentEditValue.trim() === '') {
        valueToSave = null;
      }

      const success = await onSave(recordId, fieldName, valueToSave);

      if (success) {
        setIsEditing(false);
      } else {
        setError('Failed to save');
        setEditValue(currentOriginalValue);
      }
    } catch (err) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : 'Save failed');
      setEditValue(valueToString(originalValue));
    } finally {
      setIsSaving(false);
    }
  }, [editValue, originalValue, recordId, fieldName, type, onSave]);

  const handleCancel = () => {
    setEditValue(valueToString(originalValue));
    setIsEditing(false);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleBlur = () => {
    // Small delay to allow click events to register
    setTimeout(() => {
      if (isEditing && !isSaving) {
        handleSave();
      }
    }, 150);
  };

  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

  if (isEditing) {
    return (
      <div className="relative">
        <input
          ref={inputRef}
          type={type === 'date' ? 'date' : 'text'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={isSaving}
          inputMode={type === 'number' ? 'decimal' : undefined}
          className={`
            w-full px-2 py-1
            border-2 rounded
            text-sm focus:outline-none
            ${alignClass}
            ${error ? 'border-red-500' : 'border-blue-500'}
            ${isSaving ? 'opacity-50 cursor-wait' : ''}
            ${className}
          `}
          style={{
            backgroundColor: 'var(--cui-body-bg)',
            color: 'var(--cui-body-color)'
          }}
        />
        {error && (
          <div className="absolute top-full left-0 mt-1 text-xs whitespace-nowrap z-10" style={{ color: 'var(--cui-danger)' }}>
            {error}
          </div>
        )}
        {isSaving && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <div
              className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'var(--cui-primary)' }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className={`
        px-2 py-1 cursor-pointer rounded
        transition-colors
        ${alignClass}
        ${className}
      `}
      style={{ color: 'var(--cui-body-color)' }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--cui-tertiary-bg)'}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
    >
      {displayValue}
    </div>
  );
}
