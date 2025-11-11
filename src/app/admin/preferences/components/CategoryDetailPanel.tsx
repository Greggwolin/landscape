'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Pencil } from 'lucide-react';
import type {
  UnitCostCategoryReference,
  CategoryTag,
  LifecycleStage,
} from '@/types/benchmarks';
import { updateCategory, addTagToCategory, removeTagFromCategory } from '@/lib/api/categories';
import { useToast } from '@/components/ui/toast';

interface CategoryDetailPanelProps {
  category: UnitCostCategoryReference | null;
  tags: CategoryTag[];
  onUpdate: (updated: UnitCostCategoryReference) => void;
  onDelete: (category: UnitCostCategoryReference) => void;
  onCreateTag: () => void;
}

const LIFECYCLE_STAGES: LifecycleStage[] = [
  'Acquisition',
  'Development',
  'Operations',
  'Disposition',
  'Financing',
];

// Tag color palette for smart hash-based coloring
const TAG_COLORS = [
  'primary', 'success', 'warning', 'danger', 'info',
  'purple', 'teal', 'orange', 'pink', 'indigo', 'cyan'
];

/**
 * Deterministic hash-based color assignment for tags
 * Same tag name will always get the same color
 */
const getTagColor = (tagName: string): string => {
  const hash = tagName.split('').reduce(
    (acc, char) => char.charCodeAt(0) + ((acc << 5) - acc),
    0
  );
  const index = Math.abs(hash) % TAG_COLORS.length;
  return TAG_COLORS[index];
};

/**
 * Generate AI insight based on assigned tags
 * TODO: Replace with API call to Landscaper AI for real-time tag analysis
 * Endpoint: POST /api/landscaper/analyze-tags
 */
const generateTagInsight = (tags: string[]): string => {
  if (tags.length === 0) return '';

  const tagList = tags.length === 1
    ? tags[0]
    : tags.length === 2
    ? `${tags[0]} and ${tags[1]}`
    : `${tags.slice(0, -1).join(', ')}, and ${tags[tags.length - 1]}`;

  return `This category is tagged with ${tagList}. These tags can be used to filter budget items and group related categories across lifecycle stages for analysis and reporting.`;
};

export default function CategoryDetailPanel({
  category,
  tags,
  onUpdate,
  onDelete,
  onCreateTag,
}: CategoryDetailPanelProps) {
  const { showToast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    category_name: '',
    lifecycle_stages: ['Development'] as LifecycleStage[],
    tags: [] as string[],
    sort_order: 0,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Inline tag input state
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagInputValue, setTagInputValue] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [selectedTagIndex, setSelectedTagIndex] = useState(-1);
  const tagInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (category) {
      setFormData({
        category_name: category.category_name,
        lifecycle_stages: category.lifecycle_stages,
        tags: category.tags,
        sort_order: category.sort_order,
      });
      setFormErrors({});
      setIsEditing(false);
      setShowTagInput(false);
      setTagInputValue('');
    }
  }, [category]);

  // Focus tag input when shown
  useEffect(() => {
    if (showTagInput && tagInputRef.current) {
      tagInputRef.current.focus();
    }
  }, [showTagInput]);

  if (!category) {
    return (
      <div className="category-detail-panel">
        <div className="detail-empty">
          <p className="text-muted">Select a category to view details</p>
        </div>
      </div>
    );
  }

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData({
      category_name: category.category_name,
      lifecycle_stages: category.lifecycle_stages,
      tags: category.tags,
      sort_order: category.sort_order,
    });
    setFormErrors({});
    setIsEditing(false);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.category_name.trim()) {
      errors.category_name = 'Category name is required';
    }

    if (!formData.lifecycle_stages || formData.lifecycle_stages.length === 0) {
      errors.lifecycle_stages = 'At least one lifecycle stage is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const updated = await updateCategory(category.category_id, formData);
      onUpdate(updated);
      setIsEditing(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update category';
      showToast(message, 'error');
      setFormErrors({ submit: message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveTag = async (tagName: string) => {
    try {
      await removeTagFromCategory(category.category_id, tagName);
      const updated = { ...category, tags: category.tags.filter((t) => t !== tagName) };
      onUpdate(updated);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove tag';
      showToast(message, 'error');
    }
  };

  const handleDelete = () => {
    onDelete(category);
  };

  // Filter available tags for autocomplete
  const availableTagsForInput = tags.filter((tag) => {
    const matchesInput = tag.tag_name.toLowerCase().includes(tagInputValue.toLowerCase());
    const notAssigned = !category.tags.includes(tag.tag_name);
    const matchesLifecycle = category.lifecycle_stages.some(stage =>
      tag.tag_context.split(',').map(c => c.trim()).includes(stage)
    ) || tag.tag_context === 'All';
    return matchesInput && notAssigned && matchesLifecycle && tagInputValue.trim().length > 0;
  });

  const handleTagInputChange = (value: string) => {
    setTagInputValue(value);
    setShowTagSuggestions(value.trim().length > 0);
    setSelectedTagIndex(-1);
  };

  const handleAddTagFromInput = async (tagName: string) => {
    if (!tagName.trim()) return;

    // Check if already assigned
    if (category.tags.includes(tagName)) {
      showToast('Tag already assigned to this category', 'error');
      return;
    }

    try {
      await addTagToCategory(category.category_id, tagName);
      const updated = { ...category, tags: [...category.tags, tagName] };
      onUpdate(updated);
      setTagInputValue('');
      setShowTagInput(false);
      setShowTagSuggestions(false);
      showToast(`Tag "${tagName}" added successfully`, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add tag';
      showToast(message, 'error');
    }
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showTagSuggestions && availableTagsForInput.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedTagIndex((prev) =>
          prev < availableTagsForInput.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedTagIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === 'Enter' && selectedTagIndex >= 0) {
        e.preventDefault();
        handleAddTagFromInput(availableTagsForInput[selectedTagIndex].tag_name);
      } else if (e.key === 'Escape') {
        setShowTagInput(false);
        setTagInputValue('');
        setShowTagSuggestions(false);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // No suggestions - user wants to create new tag
      const trimmedValue = tagInputValue.trim();
      if (trimmedValue) {
        // Check if tag exists in master list (case insensitive)
        const existingTag = tags.find(t => t.tag_name.toLowerCase() === trimmedValue.toLowerCase());
        if (existingTag) {
          handleAddTagFromInput(existingTag.tag_name);
        } else {
          showToast('Tag does not exist. Please select from suggestions or contact admin to create new tags.', 'error');
        }
      }
    } else if (e.key === 'Escape') {
      setShowTagInput(false);
      setTagInputValue('');
      setShowTagSuggestions(false);
    }
  };

  // For edit mode: filter tags by selected lifecycle stages (show all matching tags)
  const relevantTagsForEdit = tags.filter((tag) => {
    const contexts = tag.tag_context.split(',').map((c) => c.trim());
    const matches = formData.lifecycle_stages.some(stage => contexts.includes(stage)) || contexts.includes('All');
    return matches;
  });

  return (
    <div className="category-detail-panel">
      <div className="detail-header">
        <div className="detail-header-content">
          <h5>Category Details</h5>
          <p className="detail-header-description">
            View and manage category properties, lifecycle stages, and tags.
          </p>
        </div>
        <div className="detail-actions">
          {!isEditing ? (
            <>
              <button
                className="btn btn-sm btn-ghost-secondary"
                onClick={handleEdit}
                aria-label="Edit category"
                title="Edit"
              >
                <Pencil size={16} />
              </button>
              <button
                className="btn btn-sm btn-ghost-danger"
                onClick={handleDelete}
                aria-label="Delete category"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </>
          ) : (
            <>
              <button
                className="btn btn-sm btn-outline-secondary me-2"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                className="btn btn-sm btn-primary"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="detail-content">
        {/* Category Name */}
        <div className="form-section form-section-horizontal">
          <label className="form-label">Category Name</label>
          {isEditing ? (
            <div>
              <input
                type="text"
                className={`form-control ${formErrors.category_name ? 'is-invalid' : ''}`}
                value={formData.category_name}
                onChange={(e) =>
                  setFormData({ ...formData, category_name: e.target.value })
                }
              />
              {formErrors.category_name && (
                <div className="invalid-feedback">{formErrors.category_name}</div>
              )}
            </div>
          ) : (
            <div className="form-value">{category.category_name}</div>
          )}
        </div>

        {/* Lifecycle Stages */}
        <div className="form-section form-section-horizontal">
          <label className="form-label">Lifecycle Stages</label>
          {isEditing ? (
            <div>
              <div className="lifecycle-stages-checkboxes">
                {LIFECYCLE_STAGES.map((stage) => (
                  <div key={stage} className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id={`stage-${stage}`}
                      checked={formData.lifecycle_stages.includes(stage)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            lifecycle_stages: [...formData.lifecycle_stages, stage],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            lifecycle_stages: formData.lifecycle_stages.filter((s) => s !== stage),
                          });
                        }
                      }}
                    />
                    <label className="form-check-label" htmlFor={`stage-${stage}`}>
                      {stage}
                    </label>
                  </div>
                ))}
              </div>
              {formErrors.lifecycle_stages && (
                <div className="text-danger small mt-1">{formErrors.lifecycle_stages}</div>
              )}
            </div>
          ) : (
            <div className="form-value">
              <div className="lifecycle-badges-container">
                {category.lifecycle_stages.map((stage) => (
                  <span key={stage} className="lifecycle-badge-large" data-stage={stage}>
                    {stage}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="form-section form-section-full">
          <div className="tags-header">
            <label className="form-label">Tags</label>
          </div>

          {isEditing ? (
            <div className="tags-selection">
              {relevantTagsForEdit.length === 0 ? (
                <p className="text-muted">No tags available for the selected lifecycle stages</p>
              ) : (
                <div className="tags-grid">
                  {relevantTagsForEdit.map((tag) => (
                    <div
                      key={tag.tag_id}
                      className={`tag-option ${
                        formData.tags.includes(tag.tag_name) ? 'selected' : ''
                      }`}
                      onClick={() => {
                        if (formData.tags.includes(tag.tag_name)) {
                          setFormData({
                            ...formData,
                            tags: formData.tags.filter((t) => t !== tag.tag_name),
                          });
                        } else {
                          setFormData({
                            ...formData,
                            tags: [...formData.tags, tag.tag_name],
                          });
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.tags.includes(tag.tag_name)}
                        onChange={() => {}}
                        className="form-check-input me-2"
                      />
                      <div className="tag-option-content">
                        <div className="tag-option-name">{tag.tag_name}</div>
                        {tag.description && (
                          <div className="tag-option-desc">{tag.description}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="tags-list">
              <div className="tags-grid">
                {category.tags.map((tagName) => {
                  const tagColor = getTagColor(tagName);
                  return (
                    <div
                      key={tagName}
                      className="tag-item tag-item-colored"
                      style={{
                        backgroundColor: `rgba(var(--cui-${tagColor}-rgb), 0.15)`,
                        borderColor: `rgba(var(--cui-${tagColor}-rgb), 0.4)`,
                        color: `var(--cui-${tagColor})`,
                      }}
                    >
                      <span className="tag-name">{tagName}</span>
                      <button
                        className="tag-remove"
                        onClick={() => handleRemoveTag(tagName)}
                        aria-label="Remove tag"
                        style={{
                          color: `rgba(var(--cui-${tagColor}-rgb), 0.7)`,
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}

                {/* Inline Tag Input */}
                {showTagInput ? (
                  <div style={{ position: 'relative', minWidth: '200px' }}>
                    <input
                      ref={tagInputRef}
                      type="text"
                      className="form-control form-control-sm"
                      value={tagInputValue}
                      onChange={(e) => handleTagInputChange(e.target.value)}
                      onKeyDown={handleTagInputKeyDown}
                      onBlur={() => {
                        // Delay to allow click on suggestion
                        setTimeout(() => {
                          setShowTagInput(false);
                          setTagInputValue('');
                          setShowTagSuggestions(false);
                        }, 200);
                      }}
                      placeholder="Type to search tags..."
                      autoComplete="off"
                      style={{
                        fontSize: '0.8125rem',
                        padding: '0.375rem 0.75rem',
                      }}
                    />

                    {/* Autocomplete Suggestions */}
                    {showTagSuggestions && availableTagsForInput.length > 0 && (
                      <div
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
                        {availableTagsForInput.map((tag, index) => (
                          <div
                            key={tag.tag_id}
                            onClick={() => handleAddTagFromInput(tag.tag_name)}
                            onMouseDown={(e) => e.preventDefault()} // Prevent blur
                            style={{
                              padding: '0.5rem 0.75rem',
                              cursor: 'pointer',
                              borderBottom:
                                index < availableTagsForInput.length - 1
                                  ? '1px solid var(--cui-border-color, #d8dbe0)'
                                  : 'none',
                              background:
                                index === selectedTagIndex
                                  ? 'var(--cui-primary-bg, #e7e4f9)'
                                  : 'transparent',
                              fontSize: '0.8125rem',
                            }}
                            onMouseEnter={() => setSelectedTagIndex(index)}
                          >
                            <div
                              style={{
                                fontWeight: 600,
                                color: 'var(--cui-body-color, #4f5d73)',
                              }}
                            >
                              {tag.tag_name}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    className="tag-item tag-item-add"
                    onClick={() => setShowTagInput(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.375rem 0.75rem',
                      background: 'transparent',
                      border: '1px dashed var(--cui-border-color, #d8dbe0)',
                      borderRadius: '6px',
                      fontSize: '0.8125rem',
                      color: 'var(--cui-primary, #321fdb)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--cui-primary-bg, #e7e4f9)';
                      e.currentTarget.style.borderColor = 'var(--cui-primary, #321fdb)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = 'var(--cui-border-color, #d8dbe0)';
                    }}
                  >
                    <Plus size={12} />
                    <span>Add Tag</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Landscaper AI Insights */}
        <div className="form-section form-section-full">
          <label className="form-label">Landscaper AI Insights</label>
          <div className="ai-insights-container">
            {category.tags.length === 0 ? (
              <div className="ai-insights-empty">
                <p className="text-muted" style={{ marginBottom: 0 }}>
                  Add tags to receive AI-powered insights about this category's usage patterns and related categories.
                </p>
              </div>
            ) : (
              <div className="ai-insights-content">
                <div
                  className="ai-insights-text"
                  style={{
                    padding: '12px',
                    backgroundColor: 'rgba(var(--cui-info-rgb), 0.08)',
                    borderLeft: '3px solid var(--cui-info)',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    lineHeight: '1.5',
                    color: 'var(--cui-body-color)',
                  }}
                >
                  {generateTagInsight(category.tags)}
                </div>
              </div>
            )}
          </div>
        </div>

        {formErrors.submit && (
          <div className="alert alert-danger mt-3" role="alert">
            {formErrors.submit}
          </div>
        )}
      </div>
    </div>
  );
}
