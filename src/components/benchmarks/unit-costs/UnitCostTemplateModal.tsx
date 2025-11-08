'use client';

import React, { useState, useEffect } from 'react';
import type { UnitCostTemplateSummary, UnitCostCategoryReference, DevelopmentStage } from '@/types/benchmarks';

const ALLOWED_UOMS = ['EA', 'LF', 'CY', 'SF', 'SY', 'LS', 'MO', 'DAY', '%'] as const;
const DEFAULT_LOCATION = 'Maricopa, AZ';
const DEFAULT_SOURCE = 'Copper Nail Development';
const DEFAULT_PROJECT_TYPE = 'LAND';

interface UnitCostTemplateModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  template?: UnitCostTemplateSummary;
  categories: UnitCostCategoryReference[];
  stage?: DevelopmentStage; // Reserved for future stage-specific logic
  onClose: () => void;
  onSave: (template: Partial<UnitCostTemplateSummary>) => Promise<void>;
}

export default function UnitCostTemplateModal({
  isOpen,
  mode,
  template,
  categories,
  stage,
  onClose,
  onSave
}: UnitCostTemplateModalProps) {
  const [formData, setFormData] = useState<Partial<UnitCostTemplateSummary>>({
    category_id: template?.category_id || (categories[0]?.category_id ?? 0),
    item_name: template?.item_name || '',
    default_uom_code: template?.default_uom_code || 'EA',
    quantity: template?.quantity || null,
    typical_mid_value: template?.typical_mid_value || null,
    market_geography: template?.market_geography || DEFAULT_LOCATION,
    source: template?.source || DEFAULT_SOURCE,
    as_of_date: template?.as_of_date || new Date().toISOString().slice(0, 10),
    project_type_code: template?.project_type_code || DEFAULT_PROJECT_TYPE
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && template && mode === 'edit') {
      setFormData({
        category_id: template.category_id,
        item_name: template.item_name,
        default_uom_code: template.default_uom_code,
        quantity: template.quantity,
        typical_mid_value: template.typical_mid_value,
        market_geography: template.market_geography,
        source: template.source,
        as_of_date: template.as_of_date,
        project_type_code: template.project_type_code
      });
    } else if (isOpen && mode === 'create') {
      setFormData({
        category_id: categories[0]?.category_id ?? 0,
        item_name: '',
        default_uom_code: 'EA',
        quantity: null,
        typical_mid_value: null,
        market_geography: DEFAULT_LOCATION,
        source: DEFAULT_SOURCE,
        as_of_date: new Date().toISOString().slice(0, 10),
        project_type_code: DEFAULT_PROJECT_TYPE
      });
    }
    setErrors({});
  }, [isOpen, template, mode, categories]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.item_name?.trim()) {
      newErrors.item_name = 'Item name is required';
    } else if (formData.item_name.length > 200) {
      newErrors.item_name = 'Item name must be 200 characters or fewer';
    }

    if (!formData.default_uom_code) {
      newErrors.default_uom_code = 'Unit of measure is required';
    }

    if (!formData.category_id || formData.category_id === 0) {
      newErrors.category_id = 'Category is required';
    }

    if (formData.typical_mid_value !== null && formData.typical_mid_value < 0) {
      newErrors.typical_mid_value = 'Value must be zero or greater';
    }

    if (formData.quantity !== null && formData.quantity < 0) {
      newErrors.quantity = 'Quantity must be zero or greater';
    }

    if (formData.as_of_date && !/^\d{4}-\d{2}-\d{2}$/.test(formData.as_of_date)) {
      newErrors.as_of_date = 'Use YYYY-MM-DD format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save template:', error);
      setErrors({ form: error instanceof Error ? error.message : 'Failed to save template' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof UnitCostTemplateSummary, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-lg shadow-xl"
        style={{ backgroundColor: 'var(--cui-card-bg)', borderColor: 'var(--cui-border-color)', border: '1px solid' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: 'var(--cui-border-color)' }}>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--cui-body-color)' }}>
            {mode === 'create' ? 'Add New Template' : 'Edit Template'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none transition-colors"
            style={{ color: 'var(--cui-secondary-color)' }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-6 py-4">
            {errors.form && (
              <div className="rounded border px-4 py-3 text-sm" style={{ borderColor: 'var(--cui-danger)', backgroundColor: 'var(--cui-danger-bg)', color: 'var(--cui-danger)' }}>
                {errors.form}
              </div>
            )}

            {/* Category */}
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--cui-body-color)' }}>
                Category <span style={{ color: 'var(--cui-danger)' }}>*</span>
              </label>
              <select
                value={formData.category_id || ''}
                onChange={(e) => handleChange('category_id', parseInt(e.target.value))}
                className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--cui-body-bg)',
                  borderColor: errors.category_id ? 'var(--cui-danger)' : 'var(--cui-border-color)',
                  color: 'var(--cui-body-color)'
                }}
                required
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.category_id} value={cat.category_id}>
                    {cat.category_name}
                  </option>
                ))}
              </select>
              {errors.category_id && <p className="mt-1 text-xs" style={{ color: 'var(--cui-danger)' }}>{errors.category_id}</p>}
            </div>

            {/* Item Name */}
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--cui-body-color)' }}>
                Item Name / Description <span style={{ color: 'var(--cui-danger)' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.item_name || ''}
                onChange={(e) => handleChange('item_name', e.target.value)}
                maxLength={200}
                className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--cui-body-bg)',
                  borderColor: errors.item_name ? 'var(--cui-danger)' : 'var(--cui-border-color)',
                  color: 'var(--cui-body-color)'
                }}
                placeholder="Enter item name"
                required
              />
              {errors.item_name && <p className="mt-1 text-xs" style={{ color: 'var(--cui-danger)' }}>{errors.item_name}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* UOM */}
              <div>
                <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--cui-body-color)' }}>
                  Unit of Measure <span style={{ color: 'var(--cui-danger)' }}>*</span>
                </label>
                <select
                  value={formData.default_uom_code || ''}
                  onChange={(e) => handleChange('default_uom_code', e.target.value)}
                  className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--cui-body-bg)',
                    borderColor: errors.default_uom_code ? 'var(--cui-danger)' : 'var(--cui-border-color)',
                    color: 'var(--cui-body-color)'
                  }}
                  required
                >
                  {ALLOWED_UOMS.map((uom) => (
                    <option key={uom} value={uom}>
                      {uom}
                    </option>
                  ))}
                </select>
                {errors.default_uom_code && <p className="mt-1 text-xs" style={{ color: 'var(--cui-danger)' }}>{errors.default_uom_code}</p>}
              </div>

              {/* Quantity */}
              <div>
                <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--cui-body-color)' }}>
                  Quantity
                </label>
                <input
                  type="number"
                  value={formData.quantity ?? ''}
                  onChange={(e) => handleChange('quantity', e.target.value ? parseFloat(e.target.value) : null)}
                  step="0.01"
                  min="0"
                  className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--cui-body-bg)',
                    borderColor: errors.quantity ? 'var(--cui-danger)' : 'var(--cui-border-color)',
                    color: 'var(--cui-body-color)'
                  }}
                  placeholder="Optional"
                />
                {errors.quantity && <p className="mt-1 text-xs" style={{ color: 'var(--cui-danger)' }}>{errors.quantity}</p>}
              </div>
            </div>

            {/* Typical Value */}
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--cui-body-color)' }}>
                Typical Mid Value ($)
              </label>
              <input
                type="number"
                value={formData.typical_mid_value ?? ''}
                onChange={(e) => handleChange('typical_mid_value', e.target.value ? parseFloat(e.target.value) : null)}
                step="0.01"
                min="0"
                className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--cui-body-bg)',
                  borderColor: errors.typical_mid_value ? 'var(--cui-danger)' : 'var(--cui-border-color)',
                  color: 'var(--cui-body-color)'
                }}
                placeholder="Enter typical value"
              />
              {errors.typical_mid_value && <p className="mt-1 text-xs" style={{ color: 'var(--cui-danger)' }}>{errors.typical_mid_value}</p>}
            </div>

            {/* Market Geography */}
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--cui-body-color)' }}>
                Market Geography
              </label>
              <input
                type="text"
                value={formData.market_geography || ''}
                onChange={(e) => handleChange('market_geography', e.target.value)}
                maxLength={100}
                className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--cui-body-bg)',
                  borderColor: 'var(--cui-border-color)',
                  color: 'var(--cui-body-color)'
                }}
                placeholder={DEFAULT_LOCATION}
              />
            </div>

            {/* Source */}
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--cui-body-color)' }}>
                Source
              </label>
              <input
                type="text"
                value={formData.source || ''}
                onChange={(e) => handleChange('source', e.target.value)}
                maxLength={200}
                className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--cui-body-bg)',
                  borderColor: 'var(--cui-border-color)',
                  color: 'var(--cui-body-color)'
                }}
                placeholder={DEFAULT_SOURCE}
              />
            </div>

            {/* As of Date */}
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--cui-body-color)' }}>
                As of Date
              </label>
              <input
                type="date"
                value={formData.as_of_date || ''}
                onChange={(e) => handleChange('as_of_date', e.target.value)}
                className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--cui-body-bg)',
                  borderColor: errors.as_of_date ? 'var(--cui-danger)' : 'var(--cui-border-color)',
                  color: 'var(--cui-body-color)'
                }}
              />
              {errors.as_of_date && <p className="mt-1 text-xs" style={{ color: 'var(--cui-danger)' }}>{errors.as_of_date}</p>}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t px-6 py-4" style={{ borderColor: 'var(--cui-border-color)' }}>
            <button
              type="button"
              onClick={onClose}
              className="rounded px-4 py-2 text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'var(--cui-tertiary-bg)',
                color: 'var(--cui-body-color)'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded px-4 py-2 text-sm font-medium transition-colors"
              style={{
                backgroundColor: saving ? 'var(--cui-secondary-bg)' : 'var(--cui-primary)',
                color: 'white',
                opacity: saving ? 0.6 : 1
              }}
            >
              {saving ? 'Saving...' : mode === 'create' ? 'Add Template' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
