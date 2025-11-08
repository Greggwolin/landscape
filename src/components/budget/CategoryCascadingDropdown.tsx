// Category Cascading Dropdown Component
// v1.0 · 2025-11-02

'use client';

import React, { useEffect } from 'react';
import { CFormLabel, CFormSelect, CAlert } from '@coreui/react';
import { useBudgetCategories } from '@/hooks/useBudgetCategories';
import type { CategoryLevel } from '@/types/budget-categories';

interface CategoryCascadingDropdownProps {
  projectId: number;
  complexityMode?: 'basic' | 'standard' | 'detail';
  value: {
    level_1?: number | null;
    level_2?: number | null;
    level_3?: number | null;
    level_4?: number | null;
  };
  onChange: (value: {
    level_1?: number | null;
    level_2?: number | null;
    level_3?: number | null;
    level_4?: number | null;
  }) => void;
  disabled?: boolean;
  required?: boolean;
  hideLabels?: boolean;
}

export default function CategoryCascadingDropdown({
  projectId,
  complexityMode = 'detail',
  value,
  onChange,
  disabled = false,
  required = false,
  hideLabels = false,
}: CategoryCascadingDropdownProps) {
  const {
    selection,
    setSelection,
    visibleLevels,
    getOptionsForLevel,
    loading,
    error,
    isValidSelection,
  } = useBudgetCategories({
    projectId,
    complexityMode,
    autoFetch: true,
  });

  // Sync external value with internal selection state
  useEffect(() => {
    setSelection({
      level_1: value.level_1 || null,
      level_2: value.level_2 || null,
      level_3: value.level_3 || null,
      level_4: value.level_4 || null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.level_1, value.level_2, value.level_3, value.level_4]);

  // Sync internal selection state with external onChange
  useEffect(() => {
    onChange({
      level_1: selection.level_1,
      level_2: selection.level_2,
      level_3: selection.level_3,
      level_4: selection.level_4,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection.level_1, selection.level_2, selection.level_3, selection.level_4]);

  const handleLevelChange = (level: CategoryLevel, categoryId: string) => {
    const numericId = categoryId ? parseInt(categoryId) : null;

    setSelection({
      [`level_${level}`]: numericId,
    } as any);
  };

  // Basic mode: no category selection
  if (complexityMode === 'basic' || visibleLevels.length === 0) {
    return (
      <CAlert color="info" className="mb-0">
        Category classification is disabled in Basic complexity mode.
      </CAlert>
    );
  }

  if (error) {
    return (
      <CAlert color="danger">
        <strong>Error loading categories:</strong> {error}
      </CAlert>
    );
  }

  return (
    <div>
      {!hideLabels && <h6 className="mb-3">Budget Categories</h6>}

      {/* Level 1 */}
      {visibleLevels.includes(1) && (
        <div className="mb-3">
          {!hideLabels && (
            <CFormLabel htmlFor="category-l1">
              Level 1 Category{required && ' *'}
            </CFormLabel>
          )}
          <CFormSelect
            id="category-l1"
            value={selection.level_1 || ''}
            onChange={(e) => handleLevelChange(1, e.target.value)}
            disabled={disabled || loading}
            required={required}
          >
            <option value="">Select Level 1...</option>
            {getOptionsForLevel(1).map(cat => (
              <option key={cat.category_id} value={cat.category_id}>
                {cat.code} — {cat.name}
              </option>
            ))}
          </CFormSelect>
          {getOptionsForLevel(1).length === 0 && (
            <small className="text-medium-emphasis">
              No Level 1 categories available. Create categories in Settings.
            </small>
          )}
        </div>
      )}

      {/* Level 2 */}
      {visibleLevels.includes(2) && selection.level_1 && (
        <div className="mb-3">
          {!hideLabels && <CFormLabel htmlFor="category-l2">Level 2 Category</CFormLabel>}
          <CFormSelect
            id="category-l2"
            value={selection.level_2 || ''}
            onChange={(e) => handleLevelChange(2, e.target.value)}
            disabled={disabled || loading || !selection.level_1}
          >
            <option value="">Select Level 2...</option>
            {getOptionsForLevel(2).map(cat => (
              <option key={cat.category_id} value={cat.category_id}>
                {cat.code} — {cat.name}
              </option>
            ))}
          </CFormSelect>
          {selection.level_1 && getOptionsForLevel(2).length === 0 && (
            <small className="text-medium-emphasis">
              No Level 2 subcategories available for selected Level 1 category.
            </small>
          )}
        </div>
      )}

      {/* Level 3 */}
      {visibleLevels.includes(3) && selection.level_2 && (
        <div className="mb-3">
          {!hideLabels && <CFormLabel htmlFor="category-l3">Level 3 Category</CFormLabel>}
          <CFormSelect
            id="category-l3"
            value={selection.level_3 || ''}
            onChange={(e) => handleLevelChange(3, e.target.value)}
            disabled={disabled || loading || !selection.level_2}
          >
            <option value="">Select Level 3...</option>
            {getOptionsForLevel(3).map(cat => (
              <option key={cat.category_id} value={cat.category_id}>
                {cat.code} — {cat.name}
              </option>
            ))}
          </CFormSelect>
          {selection.level_2 && getOptionsForLevel(3).length === 0 && (
            <small className="text-medium-emphasis">
              No Level 3 subcategories available for selected Level 2 category.
            </small>
          )}
        </div>
      )}

      {/* Level 4 */}
      {visibleLevels.includes(4) && selection.level_3 && (
        <div className="mb-3">
          {!hideLabels && <CFormLabel htmlFor="category-l4">Level 4 Category</CFormLabel>}
          <CFormSelect
            id="category-l4"
            value={selection.level_4 || ''}
            onChange={(e) => handleLevelChange(4, e.target.value)}
            disabled={disabled || loading || !selection.level_3}
          >
            <option value="">Select Level 4...</option>
            {getOptionsForLevel(4).map(cat => (
              <option key={cat.category_id} value={cat.category_id}>
                {cat.code} — {cat.name}
              </option>
            ))}
          </CFormSelect>
          {selection.level_3 && getOptionsForLevel(4).length === 0 && (
            <small className="text-medium-emphasis">
              No Level 4 subcategories available for selected Level 3 category.
            </small>
          )}
        </div>
      )}

      {/* Validation Errors */}
      {!isValidSelection && selection.errors.length > 0 && (
        <CAlert color="warning" className="mt-2">
          <ul className="mb-0 ps-3">
            {selection.errors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </CAlert>
      )}

      {/* Breadcrumb Display */}
      {selection.level_1 && (
        <div className="mt-3 p-2 border rounded" style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
          <small className="text-medium-emphasis">Selected Path:</small>
          <div className="fw-semibold">
            {[
              selection.level_1_options.find(c => c.category_id === selection.level_1)?.name,
              selection.level_2 && selection.level_2_options.find(c => c.category_id === selection.level_2)?.name,
              selection.level_3 && selection.level_3_options.find(c => c.category_id === selection.level_3)?.name,
              selection.level_4 && selection.level_4_options.find(c => c.category_id === selection.level_4)?.name,
            ].filter(Boolean).join(' → ')}
          </div>
        </div>
      )}
    </div>
  );
}
