'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';

interface DocTypeComboboxProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  existingTypes: string[];
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  onSubmit?: () => void;
}

/**
 * Combobox for selecting/creating doc type filters.
 * Shows autocomplete from all template doc types across all templates,
 * but allows freeform entry for custom types.
 * Existing project types are shown as disabled in the suggestion list.
 */
export default function DocTypeCombobox({
  value,
  onChange,
  suggestions,
  existingTypes,
  placeholder = 'Type to search or create...',
  disabled = false,
  autoFocus = false,
  onSubmit,
}: DocTypeComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const existingSet = new Set(existingTypes.map((t) => t.toLowerCase()));

  // Filter suggestions based on input
  const filtered = value.trim()
    ? suggestions.filter(
        (s) =>
          s.toLowerCase().includes(value.toLowerCase().trim())
      )
    : suggestions;

  // Check if current value is an exact match to an existing type
  const isDuplicate = existingSet.has(value.trim().toLowerCase());

  // Check if current value matches a suggestion exactly
  const isExactSuggestion = suggestions.some(
    (s) => s.toLowerCase() === value.trim().toLowerCase()
  );

  const handleSelect = useCallback(
    (selected: string) => {
      if (existingSet.has(selected.toLowerCase())) return; // Can't select existing
      onChange(selected);
      setIsOpen(false);
      setHighlightIndex(-1);
    },
    [onChange, existingSet]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
        setHighlightIndex((prev) =>
          prev < filtered.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev > 0 ? prev - 1 : filtered.length - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < filtered.length) {
          handleSelect(filtered[highlightIndex]);
        }
        onSubmit?.();
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        setHighlightIndex(-1);
      }
    },
    [filtered, highlightIndex, handleSelect, onSubmit]
  );

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const items = listRef.current.children;
      if (items[highlightIndex]) {
        (items[highlightIndex] as HTMLElement).scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightIndex]);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="text"
        className="form-control"
        style={{
          backgroundColor: 'var(--cui-input-bg)',
          color: 'var(--cui-body-color)',
          borderColor: isDuplicate ? 'var(--cui-danger)' : 'var(--cui-border-color)',
        }}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
          setHighlightIndex(-1);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />

      {isDuplicate && (
        <div
          className="text-xs mt-1"
          style={{ color: 'var(--cui-danger)' }}
        >
          This type already exists in the project
        </div>
      )}

      {isOpen && filtered.length > 0 && (
        <div
          ref={listRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1050,
            maxHeight: '200px',
            overflowY: 'auto',
            backgroundColor: 'var(--cui-body-bg)',
            border: '1px solid var(--cui-border-color)',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {!isExactSuggestion && value.trim() && (
            <div
              style={{
                padding: '6px 12px',
                fontSize: '0.8rem',
                color: 'var(--cui-secondary-color)',
                borderBottom: '1px solid var(--cui-border-color)',
              }}
            >
              Press Enter to create &ldquo;{value.trim()}&rdquo;
            </div>
          )}
          {filtered.map((suggestion, idx) => {
            const isExisting = existingSet.has(suggestion.toLowerCase());
            const isHighlighted = idx === highlightIndex;

            return (
              <div
                key={suggestion}
                style={{
                  padding: '6px 12px',
                  cursor: isExisting ? 'not-allowed' : 'pointer',
                  backgroundColor: isHighlighted
                    ? 'var(--cui-primary-bg)'
                    : 'transparent',
                  color: isExisting
                    ? 'var(--cui-secondary-color)'
                    : 'var(--cui-body-color)',
                  opacity: isExisting ? 0.5 : 1,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
                onClick={() => !isExisting && handleSelect(suggestion)}
                onMouseEnter={() => !isExisting && setHighlightIndex(idx)}
              >
                <span>{suggestion}</span>
                {isExisting && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--cui-secondary-color)',
                    }}
                  >
                    already added
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
