'use client';

import React, { useState } from 'react';
import {
  CAlert,
  CButton,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react';
import type {
  UnitCostCategoryReference,
  CategoryTag,
  Activity,
} from '@/types/benchmarks';
import { createCategory } from '@/lib/api/categories';
import { useToast } from '@/components/ui/toast';
import { SemanticBadge } from '@/components/ui/landscape';

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
  'Improvements',  // Renamed from Development
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
    <CModal visible onClose={onClose} size="lg" backdrop="static" alignment="center">
      <CModalHeader closeButton>
        <CModalTitle>Add New Category</CModalTitle>
      </CModalHeader>
      <form onSubmit={handleSubmit}>
        <CModalBody>
          <div className="mb-3">
            <CFormLabel>
              Category Name <span className="text-danger">*</span>
            </CFormLabel>
            <CFormInput
              invalid={Boolean(formErrors.category_name)}
              value={formData.category_name}
              onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
              placeholder="Enter category name"
              autoFocus
            />
            {formErrors.category_name && (
              <div className="invalid-feedback d-block">{formErrors.category_name}</div>
            )}
          </div>

          <div className="mb-3">
            <CFormLabel>
              Lifecycle Stages <span className="text-danger">*</span>
            </CFormLabel>
            <div className="d-flex flex-wrap gap-3">
              {LIFECYCLE_STAGES.map((stage) => (
                <CFormCheck
                  key={stage}
                  id={`add-stage-${stage}`}
                  label={stage}
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
                        parent_id: null,
                      });
                    }
                  }}
                />
              ))}
            </div>
            {formErrors.activitys && (
              <div className="text-danger small mt-1">{formErrors.activitys}</div>
            )}
            <small className="text-medium-emphasis">
              Select all lifecycle stages this category applies to
            </small>
          </div>

          <div className="mb-3">
            <CFormLabel>Parent Category (Optional)</CFormLabel>
            <CFormSelect
              value={formData.parent_id || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  parent_id: e.target.value ? parseInt(e.target.value, 10) : null,
                })
              }
            >
              <option value="">None (Top Level)</option>
              {availableParents.map((cat) => (
                <option key={cat.category_id} value={cat.category_id}>
                  {cat.category_name}
                </option>
              ))}
            </CFormSelect>
            <small className="text-medium-emphasis">
              Parent must share at least one lifecycle stage
            </small>
          </div>

          <div className="mb-3">
            <CFormLabel>Tags</CFormLabel>
            {relevantTags.length === 0 ? (
              <p className="text-medium-emphasis mb-0">
                No tags available for the selected lifecycle stages
              </p>
            ) : (
              <div className="d-flex flex-wrap gap-2">
                {relevantTags.map((tag) => {
                  const isSelected = formData.tags.includes(tag.tag_name);
                  return (
                    <button
                      key={tag.tag_id}
                      type="button"
                      className="btn btn-sm p-0 border-0 bg-transparent"
                      onClick={() => toggleTag(tag.tag_name)}
                      title={tag.description || tag.tag_name}
                    >
                      <SemanticBadge
                        intent="user-tag"
                        value={tag.tag_name}
                        userTagState={isSelected ? 'filled' : 'outline'}
                        className="tag-chip-label"
                      />
                    </button>
                  );
                })}
              </div>
            )}
            {formData.tags.length > 0 && (
              <small className="text-medium-emphasis d-block mt-1">
                Selected: {formData.tags.join(', ')}
              </small>
            )}
          </div>

          <div className="mb-3">
            <CFormLabel>Sort Order</CFormLabel>
            <CFormInput
              type="number"
              value={formData.sort_order}
              onChange={(e) =>
                setFormData({ ...formData, sort_order: parseInt(e.target.value, 10) || 0 })
              }
            />
            <small className="text-medium-emphasis">Lower numbers appear first in the list</small>
          </div>

          {formErrors.submit && <CAlert color="danger" className="mb-0">{formErrors.submit}</CAlert>}
        </CModalBody>
        <CModalFooter>
          <CButton type="button" color="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </CButton>
          <CButton type="submit" color="primary" disabled={isSaving}>
            {isSaving ? 'Creating...' : 'Create Category'}
          </CButton>
        </CModalFooter>
      </form>
    </CModal>
  );
}
