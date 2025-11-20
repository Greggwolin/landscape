'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import type {
  UnitCostCategoryReference,
  CategoryTag,
  Activity,
} from '@/types/benchmarks';
import { createCategory } from '@/lib/api/categories';
import { useToast } from '@/components/ui/toast';

interface AddCategoryModalProps {
  tags: CategoryTag[];
  categories: UnitCostCategoryReference[];
  initialStages?: Activity[];
  initialParentId?: number | null;
  onClose: () => void;
  onCreated: (category: UnitCostCategoryReference) => void;
}

const LIFECYCLE_STAGES: Activity[] = [
  'Acquisition',
  'Planning & Engineering',
  'Development',
  'Operations',
  'Disposition',
  'Financing',
];

export default function AddCategoryModal({
  tags,
  categories,
  initialStages = [],
  initialParentId = null,
  onClose,
  onCreated,
}: AddCategoryModalProps) {
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    category_name: '',
    activitys: initialStages,
    parent_id: initialParentId,
    tags: [] as string[],
    sort_order: 0,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.category_name.trim()) {
      errors.category_name = 'Category name is required';
    }

    if (!formData.activitys || formData.activitys.length === 0) {
      errors.activitys = 'At least one lifecycle stage is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const newCategory = await createCategory({
        category_name: formData.category_name,
        activitys: formData.activitys,
        tags: formData.tags,
        parent: formData.parent_id,
        sort_order: formData.sort_order,
      });
      onCreated(newCategory);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create category';
      showToast(message, 'error');
      setFormErrors({ submit: message });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTag = (tagName: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tagName)
        ? prev.tags.filter((t) => t !== tagName)
        : [...prev.tags, tagName],
    }));
  };

  // Get relevant tags for selected lifecycle stages
  const relevantTags = tags.filter((tag) => {
    const contexts = tag.tag_context.split(',').map((c) => c.trim());
    return formData.activitys.some(stage => contexts.includes(stage)) || contexts.includes('All');
  });

  // Get available parent categories (must share at least one lifecycle stage)
  const availableParents = categories.filter(
    (cat) => cat.activitys.some(stage => formData.activitys.includes(stage)) && cat.is_active
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Add New Category</h5>
            <button className="btn-close" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {/* Category Name */}
              <div className="mb-3">
                <label className="form-label">
                  Category Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className={`form-control ${formErrors.category_name ? 'is-invalid' : ''}`}
                  value={formData.category_name}
                  onChange={(e) =>
                    setFormData({ ...formData, category_name: e.target.value })
                  }
                  placeholder="Enter category name"
                  autoFocus
                />
                {formErrors.category_name && (
                  <div className="invalid-feedback">{formErrors.category_name}</div>
                )}
              </div>

              {/* Lifecycle Stages */}
              <div className="mb-3">
                <label className="form-label">
                  Lifecycle Stages <span className="text-danger">*</span>
                </label>
                <div className="lifecycle-stages-checkboxes">
                  {LIFECYCLE_STAGES.map((stage) => (
                    <div key={stage} className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id={`add-stage-${stage}`}
                        checked={formData.activitys.includes(stage)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              activitys: [...formData.activitys, stage],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              activitys: formData.activitys.filter((s) => s !== stage),
                              parent_id: null, // Reset parent when stages change
                            });
                          }
                        }}
                      />
                      <label className="form-check-label" htmlFor={`add-stage-${stage}`}>
                        {stage}
                      </label>
                    </div>
                  ))}
                </div>
                {formErrors.activitys && (
                  <div className="text-danger small mt-1">{formErrors.activitys}</div>
                )}
                <small className="form-text text-muted">
                  Select all lifecycle stages this category applies to
                </small>
              </div>

              {/* Parent Category (Optional) */}
              <div className="mb-3">
                <label className="form-label">Parent Category (Optional)</label>
                <select
                  className="form-select"
                  value={formData.parent_id || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      parent_id: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                >
                  <option value="">None (Top Level)</option>
                  {availableParents.map((cat) => (
                    <option key={cat.category_id} value={cat.category_id}>
                      {cat.category_name}
                    </option>
                  ))}
                </select>
                <small className="form-text text-muted">
                  Parent must share at least one lifecycle stage
                </small>
              </div>

              {/* Tags */}
              <div className="mb-3">
                <label className="form-label">Tags</label>
                <div className="tags-selection">
                  {relevantTags.length === 0 ? (
                    <p className="text-muted">No tags available for the selected lifecycle stages</p>
                  ) : (
                    <div className="tags-chip-row" style={{ gap: '8px', flexWrap: 'wrap' }}>
                      {relevantTags.map((tag) => {
                        const isSelected = formData.tags.includes(tag.tag_name);
                        return (
                          <button
                            key={tag.tag_id}
                            type="button"
                            className={`tag-chip ${isSelected ? 'filled' : 'outline'}`}
                            onClick={() => toggleTag(tag.tag_name)}
                            title={tag.description || tag.tag_name}
                          >
                            <span className="tag-chip-label">{tag.tag_name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {formData.tags.length > 0 && (
                  <small className="form-text text-muted">
                    Selected: {formData.tags.join(', ')}
                  </small>
                )}
              </div>

              {/* Sort Order */}
              <div className="mb-3">
                <label className="form-label">Sort Order</label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.sort_order}
                  onChange={(e) =>
                    setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
                  }
                />
                <small className="form-text text-muted">
                  Lower numbers appear first in the list
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
                {isSaving ? 'Creating...' : 'Create Category'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
