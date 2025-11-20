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
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none"
                aria-label={`Remove ${tag}`}
              >
                <XMarkIcon className="w-3.5 h-3.5" />
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
          className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
        />

        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.tag_name}
                type="button"
                onClick={() => addTag(suggestion.tag_name)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  selectedIndex === index
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : ''
                }`}
              >
                <span className="text-gray-900 dark:text-gray-100">
                  {suggestion.tag_name}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                  {suggestion.usage_count} uses
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Helper Text */}
      <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
        Press Enter or comma to add a tag. {value.length}/{maxTags} tags
      </p>
    </div>
  );
}
