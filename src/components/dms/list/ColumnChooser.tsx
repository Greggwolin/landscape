'use client';

import React, { useState, useRef, useEffect } from 'react';
import CIcon from '@coreui/icons-react';
import { cilSettings } from '@coreui/icons';

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  required?: boolean; // Cannot be hidden
}

interface ColumnChooserProps {
  columns: ColumnConfig[];
  onChange: (columns: ColumnConfig[]) => void;
  storageKey?: string;
}

export default function ColumnChooser({
  columns,
  onChange,
  storageKey
}: ColumnChooserProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    if (!storageKey) return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const savedVisibility = JSON.parse(stored) as Record<string, boolean>;
        const updated = columns.map(col => ({
          ...col,
          visible: col.required ? true : (savedVisibility[col.id] ?? col.visible)
        }));
        onChange(updated);
      }
    } catch (e) {
      console.warn('Failed to load column preferences:', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const handleToggle = (columnId: string) => {
    const updated = columns.map(col => {
      if (col.id === columnId && !col.required) {
        return { ...col, visible: !col.visible };
      }
      return col;
    });

    onChange(updated);

    // Save to localStorage
    if (storageKey) {
      const visibility: Record<string, boolean> = {};
      updated.forEach(col => {
        visibility[col.id] = col.visible;
      });
      localStorage.setItem(storageKey, JSON.stringify(visibility));
    }
  };

  const visibleCount = columns.filter(c => c.visible).length;
  const totalCount = columns.length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        title="Choose visible columns"
      >
        <CIcon icon={cilSettings} className="w-3.5 h-3.5" />
        <span>Columns</span>
        <span className="text-gray-400 dark:text-gray-500">({visibleCount}/{totalCount})</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[180px]">
          <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
            Toggle Columns
          </div>
          {columns.map(col => (
            <label
              key={col.id}
              className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                col.required ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={col.visible}
                onChange={() => handleToggle(col.id)}
                disabled={col.required}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
              />
              <span className="text-gray-700 dark:text-gray-200">{col.label}</span>
              {col.required && (
                <span className="text-xs text-gray-400 dark:text-gray-500">(required)</span>
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
