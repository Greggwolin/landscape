'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import type { CategoryTag } from '@/types/benchmarks';
import { createTag, addTagToCategory } from '@/lib/api/categories';
import { useToast } from '@/components/ui/toast';

interface CreateTagModalProps {
  onClose: () => void;
  onCreated: (tag: CategoryTag) => void;
  existingTags: CategoryTag[];
  categoryId: number;
  assignedTags: string[];
}

export default function CreateTagModal({
  onClose,
  onCreated,
  existingTags,
  categoryId,
  assignedTags
}: CreateTagModalProps) {
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    tag_name: '',
    description: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Filter existing tags based on input, excluding already assigned tags
  const filteredSuggestions = existingTags.filter((tag) => {
    const matchesInput = tag.tag_name.toLowerCase().includes(formData.tag_name.toLowerCase());
    const notAssigned = !assignedTags.includes(tag.tag_name);
    return matchesInput && notAssigned && formData.tag_name.trim().length > 0;
  });

  useEffect(() => {
    setShowSuggestions(filteredSuggestions.length > 0);
    setSelectedSuggestionIndex(-1);
  }, [formData.tag_name]);

  const handleInputChange = (value: string) => {
    setFormData({ ...formData, tag_name: value });
    setFormErrors({ ...formErrors, tag_name: '' });
  };

  const handleSelectSuggestion = async (tag: CategoryTag) => {
    setIsSaving(true);
    try {
      await addTagToCategory(categoryId, tag.tag_name);
      onCreated(tag);
      showToast(`Tag "${tag.tag_name}" added successfully`, 'success');
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add tag';
      showToast(message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || filteredSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(filteredSuggestions[selectedSuggestionIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.tag_name.trim()) {
      errors.tag_name = 'Tag name is required';
    }

    // Check if tag already exists
    const existingTag = existingTags.find(
      (tag) => tag.tag_name.toLowerCase() === formData.tag_name.trim().toLowerCase()
    );
    if (existingTag) {
      errors.tag_name = 'A tag with this name already exists. Use autocomplete to select it.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const newTag = await createTag({
        tag_name: formData.tag_name.trim(),
        tag_context: 'All', // Custom tags are lifecycle-agnostic
        description: formData.description || undefined,
      });

      // Automatically assign the new tag to the category
      await addTagToCategory(categoryId, newTag.tag_name);

      onCreated(newTag);
      showToast(`Tag "${newTag.tag_name}" created and added successfully`, 'success');
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create tag';
      showToast(message, 'error');
      setFormErrors({ submit: message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Add Tag</h5>
            <button className="btn-close" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {/* Tag Name with Autocomplete */}
              <div className="mb-3" style={{ position: 'relative' }}>
                <label className="form-label">
                  Tag Name <span className="text-danger">*</span>
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  className={`form-control ${formErrors.tag_name ? 'is-invalid' : ''}`}
                  value={formData.tag_name}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g., Professional Services, Legal, etc."
                  autoFocus
                  autoComplete="off"
                />
                {formErrors.tag_name && (
                  <div className="invalid-feedback">{formErrors.tag_name}</div>
                )}

                {/* Autocomplete Suggestions */}
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 1000,
                      marginTop: '4px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      background: 'var(--cui-card-bg, #fff)',
                      border: '1px solid var(--cui-border-color, #d8dbe0)',
                      borderRadius: '6px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                    }}
                  >
                    {filteredSuggestions.map((tag, index) => (
                      <div
                        key={tag.tag_id}
                        onClick={() => handleSelectSuggestion(tag)}
                        style={{
                          padding: '0.75rem',
                          cursor: 'pointer',
                          borderBottom:
                            index < filteredSuggestions.length - 1
                              ? '1px solid var(--cui-border-color, #d8dbe0)'
                              : 'none',
                          background:
                            index === selectedSuggestionIndex
                              ? 'var(--cui-primary-bg, #e7e4f9)'
                              : 'transparent',
                        }}
                        onMouseEnter={() => setSelectedSuggestionIndex(index)}
                      >
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            color: 'var(--cui-body-color, #4f5d73)',
                            marginBottom: tag.description ? '0.25rem' : 0,
                          }}
                        >
                          {tag.tag_name}
                        </div>
                        {tag.description && (
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--cui-secondary-color, #768192)',
                            }}
                          >
                            {tag.description}
                          </div>
                        )}
                        <div
                          style={{
                            fontSize: '0.625rem',
                            color: 'var(--cui-secondary-color, #768192)',
                            marginTop: '0.25rem',
                          }}
                        >
                          Context: {tag.tag_context}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="mb-3">
                <label className="form-label">Description (Optional)</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of what this tag represents"
                />
              </div>

              <div className="alert alert-info" role="alert">
                <small>
                  Start typing to see matching tags. Select an existing tag from the dropdown or create a
                  new custom tag. New tags are automatically available across all lifecycle stages.
                </small>
              </div>

              {formErrors.submit && (
                <div className="alert alert-danger" role="alert">
                  {formErrors.submit}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>
                {isSaving ? 'Creating...' : 'Create Tag'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
