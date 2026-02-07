'use client';

import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface TagSuggestion {
  tag_name: string;
  usage_count: number;
}

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  projectId?: number;
  workspaceId?: number;
  placeholder?: string;
  maxTags?: number;
  disabled?: boolean;
}

export default function TagInput({
  value = [],
  onChange,
  projectId,
  workspaceId,
  placeholder = 'Type to add tags...',
  maxTags = 20,
  disabled = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch suggestions when input changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (inputValue.trim().length < 1) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      if (!projectId && !workspaceId) {
        console.warn('TagInput: projectId or workspaceId required for suggestions');
        return;
      }

      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          prefix: inputValue.trim(),
          limit: '10',
        });

        if (projectId) params.append('project_id', projectId.toString());
        if (workspaceId) params.append('workspace_id', workspaceId.toString());

        const response = await fetch(`/api/dms/tags/suggest?${params.toString()}`);

        if (!response.ok) {
          throw new Error('Failed to fetch suggestions');
        }

        const data = await response.json();

        // Filter out tags that are already selected
        const filteredSuggestions = (data.suggestions || []).filter(
          (suggestion: TagSuggestion) => !value.includes(suggestion.tag_name)
        );

        setSuggestions(filteredSuggestions);
        setShowSuggestions(filteredSuggestions.length > 0);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Error fetching tag suggestions:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(debounceTimer);
  }, [inputValue, projectId, workspaceId, value]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();

    if (!trimmedTag) return;

    // Check for duplicates (case-insensitive)
    if (value.some(t => t.toLowerCase() === trimmedTag.toLowerCase())) {
      setInputValue('');
      setShowSuggestions(false);
      inputRef.current?.focus();
      return;
    }

    // Check max tags limit
    if (value.length >= maxTags) {
      alert(`Maximum ${maxTags} tags allowed`);
      return;
    }

    onChange([...value, trimmedTag]);
    setInputValue('');
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle Enter or Comma to add tag
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();

      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        // Add selected suggestion
        addTag(suggestions[selectedIndex].tag_name);
      } else if (inputValue.trim()) {
        // Add typed value as new tag
        addTag(inputValue);
      }
    }

    // Handle Backspace to remove last tag when input is empty
    else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value.length - 1);
    }

    // Handle arrow key navigation
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    }
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    }

    // Handle Escape to close suggestions
    else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Don't allow comma in the input (it's a delimiter)
    if (newValue.includes(',')) {
      const tag = newValue.replace(',', '').trim();
      if (tag) addTag(tag);
      return;
    }

    setInputValue(newValue);
  };

  return (
    <div className="w-full">
      {/* Tags Display */}
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className="d-inline-flex align-items-center gap-1 px-2 py-1 rounded-pill"
            style={{
              backgroundColor: 'var(--cui-primary-bg-subtle)',
              color: 'var(--cui-primary)',
              border: '1px solid var(--cui-primary-border-subtle)',
              fontSize: '0.75rem'
            }}
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(index)}
                style={{ color: 'var(--cui-primary)' }}
                aria-label={`Remove ${tag}`}
              >
                <XMarkIcon style={{ width: '14px', height: '14px' }} />
              </button>
            )}
          </span>
        ))}
      </div>

      {/* Input Field */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          disabled={disabled}
          placeholder={value.length >= maxTags ? `Maximum ${maxTags} tags reached` : placeholder}
          className="form-control form-control-sm"
          style={{
            backgroundColor: 'var(--cui-input-bg)',
            borderColor: 'var(--cui-border-color)',
            color: 'var(--cui-body-color)'
          }}
        />

        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="spinner-border spinner-border-sm" role="status" />
          </div>
        )}

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={dropdownRef}
            className="position-absolute z-3 w-100 mt-1 border rounded shadow"
            style={{
              backgroundColor: 'var(--cui-card-bg)',
              borderColor: 'var(--cui-card-border-color)',
              maxHeight: '15rem',
              overflow: 'auto'
            }}
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.tag_name}
                type="button"
                onClick={() => addTag(suggestion.tag_name)}
                onMouseEnter={() => setSelectedIndex(index)}
                className="w-100 text-start px-3 py-2 d-flex align-items-center justify-content-between"
                style={{
                  backgroundColor: selectedIndex === index ? 'var(--cui-primary-bg-subtle)' : 'transparent',
                  color: 'var(--cui-body-color)'
                }}
              >
                <span style={{ color: 'var(--cui-body-color)' }}>
                  {suggestion.tag_name}
                </span>
                <span className="small" style={{ color: 'var(--cui-secondary-color)' }}>
                  {suggestion.usage_count} uses
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Helper Text */}
      <p className="mt-1 small" style={{ color: 'var(--cui-secondary-color)' }}>
        Press Enter or comma to add a tag. {value.length}/{maxTags} tags
      </p>
    </div>
  );
}
