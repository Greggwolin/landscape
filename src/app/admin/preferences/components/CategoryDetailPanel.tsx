'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Pencil } from 'lucide-react';
import type {
  UnitCostCategoryReference,
  CategoryTag,
  LifecycleStage,
} from '@/types/benchmarks';
import { updateCategory, createTag, deleteTag } from '@/lib/api/categories';
import { useToast } from '@/components/ui/toast';

interface CategoryDetailPanelProps {
  category: UnitCostCategoryReference | null;
  allCategories: UnitCostCategoryReference[];
  tags: CategoryTag[];
  onUpdate: (updated: UnitCostCategoryReference) => void;
  onDelete: (category: UnitCostCategoryReference) => void;
  onCreateTag: () => void;
  onTagDeleted: (tagName: string) => void;
}

const LIFECYCLE_STAGES: LifecycleStage[] = [
  'Acquisition',
  'Development',
  'Operations',
  'Disposition',
  'Financing',
];

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

const buildSortedTags = (
  tagLibrary: CategoryTag[],
  categoryTags: string[]
): CategoryTag[] => {
  const tagMap = new Map<string, CategoryTag>();

  tagLibrary.forEach((tag) => {
    const key = tag.tag_name.trim().toLowerCase();
    if (key) {
      tagMap.set(key, tag);
    }
  });

  categoryTags.forEach((tagName, index) => {
    const trimmed = tagName.trim();
    const key = trimmed.toLowerCase();
    if (!key || tagMap.has(key)) return;
    tagMap.set(key, {
      tag_id: -(index + 1),
      tag_name: trimmed,
      tag_context: 'All',
      is_system_default: false,
      description: 'Previously assigned tag',
      display_order: 999,
      is_active: true,
    });
  });

  return Array.from(tagMap.values()).sort((a, b) => {
    if (a.display_order !== b.display_order) {
      return a.display_order - b.display_order;
    }
    return a.tag_name.localeCompare(b.tag_name);
  });
};

export default function CategoryDetailPanel({
  category,
  allCategories,
  tags,
  onUpdate,
  onDelete,
  onCreateTag,
  onTagDeleted,
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
  const tagInputRef = useRef<HTMLInputElement>(null);
  const lifecyclePickerRef = useRef<HTMLDivElement>(null);
  const [isLifecycleUpdating, setIsLifecycleUpdating] = useState(false);
  const [showLifecyclePicker, setShowLifecyclePicker] = useState(false);
  const [isTagUpdating, setIsTagUpdating] = useState(false);
  const [localTags, setLocalTags] = useState<CategoryTag[]>(tags);

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
      setShowLifecyclePicker(false);
      setIsLifecycleUpdating(false);
    }
  }, [category]);

  // Focus tag input when shown
  useEffect(() => {
    if (showTagInput && tagInputRef.current) {
      tagInputRef.current.focus();
    }
  }, [showTagInput]);

  useEffect(() => {
    setLocalTags(tags);
  }, [tags]);

  useEffect(() => {
    if (!showLifecyclePicker) return;
    const handleClick = (event: MouseEvent) => {
      if (
        lifecyclePickerRef.current &&
        !lifecyclePickerRef.current.contains(event.target as Node)
      ) {
        setShowLifecyclePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showLifecyclePicker]);

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

  const applyTagChanges = async (nextTags: string[], successMessage?: string) => {
    setIsTagUpdating(true);
    try {
      const updated = await updateCategory(category.category_id, {
        category_name: category.category_name,
        lifecycle_stages: category.lifecycle_stages,
        tags: nextTags,
        sort_order: category.sort_order,
        parent: category.parent ?? null,
        is_active: category.is_active,
      });
      onUpdate(updated);
      if (successMessage) {
        showToast(successMessage, 'success');
      }
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update tags';
      showToast(message, 'error');
      return false;
    } finally {
      setIsTagUpdating(false);
    }
  };

  const assignTag = async (tagName: string, showSuccessToast = false) => {
    const trimmed = tagName.trim();
    if (!trimmed) return false;

    if (category.tags.some((tag) => tag.toLowerCase() === trimmed.toLowerCase())) {
      if (showSuccessToast) {
        showToast('Tag already assigned to this category', 'error');
      }
      return false;
    }

    let canonicalTagName = trimmed;
    let tagRecord = localTags.find(
      (tag) => tag.tag_name.toLowerCase() === trimmed.toLowerCase()
    );

    if (!tagRecord) {
      try {
        const newTag = await createTag({
          tag_name: trimmed,
          tag_context: 'All',
          description: undefined,
        });
        tagRecord = newTag;
        canonicalTagName = newTag.tag_name;
        setLocalTags((prev) => [...prev, newTag]);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create tag';
        showToast(message, 'error');
        return false;
      }
    } else {
      canonicalTagName = tagRecord.tag_name;
    }

    const nextTags = [...category.tags, canonicalTagName];
    return applyTagChanges(
      nextTags,
      showSuccessToast ? `Tag "${canonicalTagName}" added successfully` : undefined
    );
  };

  const unassignTag = async (tagName: string, showSuccessToast = false) => {
    if (!category.tags.includes(tagName)) return false;

    const nextTags = category.tags.filter((t) => t !== tagName);
    return applyTagChanges(
      nextTags,
      showSuccessToast ? `Tag "${tagName}" removed successfully` : undefined
    );
  };

  const handleDelete = () => {
    onDelete(category);
  };

  const sortedTags = buildSortedTags(localTags, category.tags);
  const assignedTagSet = new Set(category.tags.map((tag) => tag.toLowerCase()));

  // Filter available tags for autocomplete
  const availableTagsForInput = sortedTags.filter((tag) => {
    const matchesInput = tag.tag_name.toLowerCase().includes(tagInputValue.toLowerCase());
    const notAssigned = !assignedTagSet.has(tag.tag_name.toLowerCase());
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

  const handleToggleTagInput = () => {
    setShowTagInput((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => tagInputRef.current?.focus(), 0);
      } else {
        setTagInputValue('');
        setShowTagSuggestions(false);
      }
      return next;
    });
  };

  const availableLifecycleStages = LIFECYCLE_STAGES.filter(
    (stage) => !category.lifecycle_stages.includes(stage)
  );

  const persistLifecycleStages = async (
    nextStages: LifecycleStage[],
    actionMessage: string
  ) => {
    if (nextStages.length === 0) {
      showToast('A category must have at least one lifecycle stage', 'error');
      return;
    }

    setIsLifecycleUpdating(true);
    try {
      const updated = await updateCategory(category.category_id, {
        category_name: category.category_name,
        lifecycle_stages: nextStages,
        tags: category.tags,
        sort_order: category.sort_order,
        parent: category.parent ?? null,
        is_active: category.is_active,
      });
      onUpdate(updated);
      showToast(actionMessage, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update lifecycle stages';
      showToast(message, 'error');
    } finally {
      setIsLifecycleUpdating(false);
      setShowLifecyclePicker(false);
    }
  };

  const handleRemoveLifecycleStage = (stage: LifecycleStage) => {
    if (category.lifecycle_stages.length <= 1) {
      showToast('At least one lifecycle stage is required', 'error');
      return;
    }
    const nextStages = category.lifecycle_stages.filter((s) => s !== stage);
    persistLifecycleStages(nextStages, `Removed ${stage}`);
  };

  const handleAddLifecycleStage = (stage: LifecycleStage) => {
    if (category.lifecycle_stages.includes(stage)) {
      setShowLifecyclePicker(false);
      return;
    }
    const nextStages = [...category.lifecycle_stages, stage];
    persistLifecycleStages(nextStages, `Added ${stage}`);
  };

  const handleTagChipToggle = async (tagName: string) => {
    if (isTagUpdating) return;
    if (category.tags.includes(tagName)) {
      await unassignTag(tagName);
    } else {
      await assignTag(tagName);
    }
  };

  const handleAddTagFromInput = async (tagName: string) => {
    if (!tagName.trim()) return;
    const success = await assignTag(tagName, true);
    if (success) {
      setTagInputValue('');
      setShowTagInput(false);
      setShowTagSuggestions(false);
    }
  };

  const handleDeleteTag = async (tag: CategoryTag) => {
    if (isTagUpdating) return;
    if (!tag || !tag.tag_name) return;

    const otherCategories = allCategories.filter(
      (cat) =>
        cat.category_id !== category.category_id &&
        cat.tags.some((t) => t.toLowerCase() === tag.tag_name.toLowerCase())
    );

    let confirmMessage = `Delete the tag "${tag.tag_name}"? This will remove it from all categories.`;
    if (otherCategories.length > 0) {
      const primary = otherCategories[0].category_name;
      const extraCount = otherCategories.length - 1;
      const suffix = extraCount > 0 ? ` and ${extraCount} other category${extraCount > 1 ? 'ies' : ''}` : '';
      confirmMessage = `The tag "${tag.tag_name}" is used in "${primary}"${suffix}. Do you still want to delete it for all categories?`;
    }

    if (!window.confirm(confirmMessage)) return;

    setIsTagUpdating(true);
    try {
      const removed = await removeTagFromAssignedCategories(
        tag.tag_name,
        allCategories,
        showToast
      );
      if (!removed) {
        setIsTagUpdating(false);
        return;
      }

      const tagIdNumber =
        typeof tag.tag_id === 'string' ? Number(tag.tag_id) : tag.tag_id ?? 0;

      if (!tagIdNumber || tagIdNumber <= 0) {
        setLocalTags((prev) =>
          prev.filter((t) => t.tag_name.toLowerCase() !== tag.tag_name.toLowerCase())
        );
        onTagDeleted(tag.tag_name);
        showToast(`Tag "${tag.tag_name}" deleted`, 'success');
        setIsTagUpdating(false);
        return;
      }

      await deleteTag(tagIdNumber);
      setLocalTags((prev) =>
        prev.filter((t) => t.tag_name.toLowerCase() !== tag.tag_name.toLowerCase())
      );
      onTagDeleted(tag.tag_name);
      showToast(`Tag "${tag.tag_name}" deleted`, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete tag';
      showToast(message, 'error');
    } finally {
      setIsTagUpdating(false);
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
        handleAddTagFromInput(trimmedValue);
      }
    } else if (e.key === 'Escape') {
      setShowTagInput(false);
      setTagInputValue('');
      setShowTagSuggestions(false);
    }
  };

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
                  <div key={stage} className="lifecycle-badge-large" data-stage={stage}>
                    <span>{stage}</span>
                    <button
                      type="button"
                      className="lifecycle-badge-remove"
                      onClick={() => handleRemoveLifecycleStage(stage)}
                      disabled={isLifecycleUpdating || category.lifecycle_stages.length <= 1}
                      aria-label={`Remove ${stage} stage`}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {availableLifecycleStages.length > 0 && (
                  <div className="lifecycle-add-wrapper" ref={lifecyclePickerRef}>
                    {showLifecyclePicker ? (
                      <div className="lifecycle-add-menu">
                        {availableLifecycleStages.map((stage) => (
                          <button
                            key={stage}
                            type="button"
                            onClick={() => handleAddLifecycleStage(stage)}
                            disabled={isLifecycleUpdating}
                          >
                            <Plus size={12} />
                            {stage}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="lifecycle-add-cancel"
                          onClick={() => setShowLifecyclePicker(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="lifecycle-add-chip"
                        onClick={() => setShowLifecyclePicker(true)}
                        disabled={isLifecycleUpdating}
                      >
                        <Plus size={14} />
                        {isLifecycleUpdating ? 'Updating...' : 'Add Stage'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="form-section form-section-full">
          <div className="tags-header">
            <label className="form-label">Tags</label>
          </div>

          <div className="tags-chip-row">
            {sortedTags.length === 0 ? (
              <p className="text-muted mb-0">No tags have been created yet.</p>
            ) : (
              sortedTags.map((tag) => {
                const isAssigned = assignedTagSet.has(tag.tag_name.toLowerCase());

                return (
                  <button
                    key={tag.tag_id}
                    type="button"
                    className={`tag-chip ${isAssigned ? 'filled' : 'outline'}`}
                    onClick={() => handleTagChipToggle(tag.tag_name)}
                    disabled={isTagUpdating}
                    aria-pressed={isAssigned}
                  >
                    <span className="tag-chip-label">{tag.tag_name}</span>
                    <span
                      className="tag-chip-delete"
                      role="button"
                      aria-label={`Delete ${tag.tag_name}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteTag(tag);
                      }}
                    >
                      <X size={12} />
                    </span>
                  </button>
                );
              })
            )}

            <button
              type="button"
              className="tag-chip tag-chip-add"
              onClick={handleToggleTagInput}
              disabled={isTagUpdating}
            >
              <Plus size={12} />
              Add Tag
            </button>
          </div>

          {showTagInput && (
            <div className="tags-inline-input">
              <div style={{ position: 'relative' }}>
                <input
                  ref={tagInputRef}
                  type="text"
                  className="form-control form-control-sm"
                  value={tagInputValue}
                  onChange={(e) => handleTagInputChange(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  onBlur={() => {
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
                        onMouseDown={(e) => e.preventDefault()}
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

const removeTagFromAssignedCategories = async (
  tagName: string,
  allCategories: UnitCostCategoryReference[],
  showToast: ReturnType<typeof useToast>['showToast']
) => {
  const normalized = tagName.toLowerCase();
  const targets = allCategories.filter((cat) =>
    cat.tags.some((tag) => tag.toLowerCase() === normalized)
  );

  if (targets.length === 0) return true;

  try {
    for (const cat of targets) {
      const nextTags = cat.tags.filter((tag) => tag.toLowerCase() !== normalized);
      await updateCategory(cat.category_id, {
        category_name: cat.category_name,
        lifecycle_stages: cat.lifecycle_stages,
        tags: nextTags,
        sort_order: cat.sort_order,
        parent: cat.parent ?? null,
        is_active: cat.is_active,
      });
    }
    return true;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to remove tag from categories';
    showToast(message, 'error');
    return false;
  }
};
