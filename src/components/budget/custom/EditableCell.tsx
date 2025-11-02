'use client';

import React, { useState, useEffect, useRef } from 'react';

interface EditableCellProps {
  value: string | number | null;
  type: 'text' | 'number' | 'currency' | 'date' | 'select';
  options?: { value: string; label: string }[];
  editable?: boolean;
  onSave: (newValue: any) => void;
  className?: string;
  decimals?: number;
}

export default function EditableCell({
  value,
  type,
  options = [],
  editable = true,
  onSave,
  className = '',
  decimals = 2,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  const formatDisplay = (val: string | number | null): string => {
    if (val === null || val === undefined) return '';

    switch (type) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(Number(val));
      case 'number':
        return Number(val).toFixed(decimals);
      case 'date':
        return new Date(val).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      default:
        return String(val);
    }
  };

  const handleEdit = () => {
    if (!editable) return;
    setIsEditing(true);

    // Set edit value based on type
    if (type === 'date' && value) {
      const date = new Date(value);
      setEditValue(date.toISOString().split('T')[0]);
    } else {
      setEditValue(value !== null ? String(value) : '');
    }
  };

  const handleSave = () => {
    setIsEditing(false);

    if (editValue === String(value)) return; // No change

    let parsedValue: any = editValue;

    switch (type) {
      case 'number':
      case 'currency':
        parsedValue = editValue === '' ? null : parseFloat(editValue);
        break;
      case 'date':
        parsedValue = editValue;
        break;
      case 'select':
        parsedValue = editValue;
        break;
      default:
        parsedValue = editValue;
    }

    onSave(parsedValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  if (!editable) {
    return (
      <div className={`editable-cell non-editable ${className}`}>
        {formatDisplay(value)}
      </div>
    );
  }

  if (isEditing) {
    if (type === 'select') {
      return (
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className={`editable-cell-input ${className}`}
        >
          <option value="">Select...</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={type === 'date' ? 'date' : type === 'currency' || type === 'number' ? 'number' : 'text'}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        step={type === 'number' ? '0.01' : undefined}
        className={`editable-cell-input ${className}`}
      />
    );
  }

  return (
    <div
      onClick={handleEdit}
      className={`editable-cell ${className}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
    >
      {formatDisplay(value)}
    </div>
  );
}
